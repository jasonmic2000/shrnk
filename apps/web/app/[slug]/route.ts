import { NextResponse } from 'next/server';

import { prisma } from '../../lib/prisma';
import { ensureRedisConnection } from '../../lib/redis';
import { getCachedLink, setCachedLink, setMissing } from '../../lib/link-cache';

const ANALYTICS_TTL_SECONDS = 60 * 60 * 24 * 90;
const ALLOWED_REDIRECT_STATUSES = new Set([301, 302, 307, 308]);

function safeRedirectStatus(value: unknown): 301 | 302 | 307 | 308 {
  if (typeof value === 'number' && ALLOWED_REDIRECT_STATUSES.has(value)) {
    return value as 301 | 302 | 307 | 308;
  }
  return 302;
}

let cachedDomainId: string | null = null;

async function getDefaultDomainId(hostname: string) {
  if (cachedDomainId) {
    return cachedDomainId;
  }

  const domain = await prisma.domain.findFirst({
    where: { hostname },
    select: { id: true },
  });

  if (!domain) {
    return null;
  }

  cachedDomainId = domain.id;
  return cachedDomainId;
}

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  const hostname = process.env.DEFAULT_DOMAIN_HOSTNAME || 'localhost';
  const domainId = await getDefaultDomainId(hostname);

  if (!domainId) {
    return NextResponse.json(
      {
        errorCode: 'domain_missing',
        message: 'Default domain not found. Run pnpm --filter web db:seed.',
      },
      { status: 500 },
    );
  }

  const slug = params.slug;
  let cachedLink = null;

  try {
    const redis = await ensureRedisConnection();
    cachedLink = await getCachedLink(redis, domainId, slug);
  } catch {
    cachedLink = null;
  }

  if (cachedLink?.kind === 'missing') {
    return NextResponse.json(
      { errorCode: 'not_found', message: 'Link not found.' },
      { status: 404 },
    );
  }

  let linkData = cachedLink?.kind === 'hit' ? cachedLink.value : null;

  if (!linkData) {
    const link = await prisma.link.findFirst({
      where: { domainId, slug },
      select: {
        id: true,
        destinationUrl: true,
        redirectType: true,
        disabled: true,
        expiresAt: true,
      },
    });

    if (!link) {
      try {
        const redis = await ensureRedisConnection();
        await setMissing(redis, domainId, slug);
      } catch {
        // Cache failures should not block redirects.
      }

      return NextResponse.json(
        { errorCode: 'not_found', message: 'Link not found.' },
        { status: 404 },
      );
    }

    linkData = {
      linkId: link.id,
      destinationUrl: link.destinationUrl,
      redirectType: link.redirectType,
      disabled: link.disabled,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    };

    try {
      const redis = await ensureRedisConnection();
      await setCachedLink(redis, domainId, slug, linkData);
    } catch {
      // Cache failures should not block redirects.
    }
  }

  if (linkData.disabled) {
    return NextResponse.json(
      { errorCode: 'disabled', message: 'Link is disabled.' },
      { status: 410 },
    );
  }

  if (linkData.expiresAt) {
    const expiresAt = new Date(linkData.expiresAt);
    if (
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { errorCode: 'expired', message: 'Link has expired.' },
        { status: 410 },
      );
    }
  }

  void recordClick(linkData.linkId);

  return NextResponse.redirect(linkData.destinationUrl, {
    status: safeRedirectStatus(linkData.redirectType),
  });
}

async function recordClick(linkId: string) {
  try {
    const redis = await ensureRedisConnection();
    await Promise.all([
      redis.incr(`clicks:${linkId}`),
      redis.set(`lastClickedAt:${linkId}`, new Date().toISOString(), {
        EX: ANALYTICS_TTL_SECONDS,
      }),
    ]);
  } catch {
    // Analytics failures should not block redirects.
  }
}
