import { NextResponse } from 'next/server';

import { prisma } from '../../lib/prisma';
import { ensureRedisConnection } from '../../lib/redis';

const CACHE_TTL_SECONDS = 60 * 60 * 24;
const MISSING_TTL_SECONDS = 60;
const ANALYTICS_TTL_SECONDS = 60 * 60 * 24 * 90;
const ALLOWED_REDIRECT_STATUSES = new Set([301, 302, 307, 308]);
const MISSING_SENTINEL = '__missing__';

function safeRedirectStatus(value: unknown): 301 | 302 | 307 | 308 {
  if (typeof value === 'number' && ALLOWED_REDIRECT_STATUSES.has(value)) {
    return value as 301 | 302 | 307 | 308;
  }
  return 302;
}

type CachedLink = {
  linkId: string;
  destinationUrl: string;
  redirectType: number;
  disabled: boolean;
  expiresAt: string | null;
};

function parseCachedLink(value: string | null) {
  if (!value) {
    return null;
  }

  if (value === MISSING_SENTINEL) {
    return MISSING_SENTINEL;
  }

  try {
    return JSON.parse(value) as CachedLink;
  } catch {
    return null;
  }
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
  let cached: CachedLink | typeof MISSING_SENTINEL | null = null;

  try {
    const redis = await ensureRedisConnection();
    cached = parseCachedLink(await redis.get(`link:${domainId}:${slug}`));
  } catch {
    cached = null;
  }

  if (cached === MISSING_SENTINEL) {
    return NextResponse.json(
      { errorCode: 'not_found', message: 'Link not found.' },
      { status: 404 },
    );
  }

  let linkData = cached;

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
        await redis.set(`link:${domainId}:${slug}`, MISSING_SENTINEL, {
          EX: MISSING_TTL_SECONDS,
        });
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
      await redis.set(`link:${domainId}:${slug}`, JSON.stringify(linkData), {
        EX: CACHE_TTL_SECONDS,
      });
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
