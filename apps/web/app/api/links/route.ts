import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '../../../lib/prisma';
import { ensureRedisConnection } from '../../../lib/redis';
import {
  generateSlugBase58,
  normalizeAndValidateCustomSlug,
} from '../../../lib/slug';
import { normalizeAndValidateUrl } from '../../../lib/url';
import { setCachedLink } from '../../../lib/link-cache';

const REDIRECT_TYPES = new Set([301, 302, 307, 308]);
const MAX_SLUG_ATTEMPTS = 10;

const CreateLinkSchema = z.object({
  destinationUrl: z.string(),
  slug: z.string().optional(),
  redirectType: z.number().optional(),
  expiresAt: z.string().optional(),
});

function parseRedirectType(value: number | undefined) {
  if (value === undefined) {
    return { ok: true as const, value: 302 };
  }

  if (!REDIRECT_TYPES.has(value)) {
    return {
      ok: false as const,
      errorCode: 'invalid_redirect_type',
      message: 'Redirect type must be 301, 302, 307, or 308.',
    };
  }

  return { ok: true as const, value };
}

function parseExpiresAt(value: string | undefined) {
  if (!value) {
    return { ok: true as const, value: null };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      ok: false as const,
      errorCode: 'invalid_expires_at',
      message: 'expiresAt must be a valid ISO datetime.',
    };
  }

  return { ok: true as const, value: parsed };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errorCode: 'invalid_json', message: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  const parsedBody = CreateLinkSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { errorCode: 'invalid_body', message: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const urlResult = normalizeAndValidateUrl(parsedBody.data.destinationUrl);
  if (!urlResult.ok) {
    return NextResponse.json(
      { errorCode: urlResult.errorCode, message: urlResult.message },
      { status: 400 },
    );
  }

  const redirectTypeResult = parseRedirectType(parsedBody.data.redirectType);
  if (!redirectTypeResult.ok) {
    return NextResponse.json(
      {
        errorCode: redirectTypeResult.errorCode,
        message: redirectTypeResult.message,
      },
      { status: 400 },
    );
  }

  const expiresAtResult = parseExpiresAt(parsedBody.data.expiresAt);
  if (!expiresAtResult.ok) {
    return NextResponse.json(
      {
        errorCode: expiresAtResult.errorCode,
        message: expiresAtResult.message,
      },
      { status: 400 },
    );
  }

  const hostname = process.env.DEFAULT_DOMAIN_HOSTNAME || 'localhost';
  const domain = await prisma.domain.findFirst({
    where: { hostname },
    select: { id: true },
  });

  if (!domain) {
    return NextResponse.json(
      {
        errorCode: 'domain_missing',
        message: 'Default domain not found. Run pnpm --filter web db:seed.',
      },
      { status: 500 },
    );
  }

  const warnings: string[] = [];
  const redirectType = redirectTypeResult.value;
  const immutable = redirectType === 301 || redirectType === 308;
  if (immutable) {
    warnings.push('Immutable redirect enforced for 301/308.');
  }

  let slug: string | null = null;

  if (parsedBody.data.slug) {
    const slugResult = normalizeAndValidateCustomSlug(parsedBody.data.slug);
    if (!slugResult.ok) {
      return NextResponse.json(
        { errorCode: slugResult.errorCode, message: slugResult.message },
        { status: 400 },
      );
    }

    slug = slugResult.slug;
    const existing = await prisma.link.findFirst({
      where: { domainId: domain.id, slug },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { errorCode: 'slug_taken', message: 'Slug is already in use.' },
        { status: 409 },
      );
    }
  }

  let link = null;
  let attempts = 0;

  while (!link && attempts < MAX_SLUG_ATTEMPTS) {
    attempts += 1;
    const candidateSlug = slug ?? generateSlugBase58(7);
    try {
      link = await prisma.link.create({
        data: {
          domainId: domain.id,
          slug: candidateSlug,
          destinationUrl: urlResult.url,
          redirectType,
          immutable,
          expiresAt: expiresAtResult.value,
        },
      });
    } catch (error: unknown) {
      if (!parsedBody.data.slug && isUniqueConstraintError(error)) {
        continue;
      }
      throw error;
    }
  }

  if (!link) {
    return NextResponse.json(
      {
        errorCode: 'slug_generation_failed',
        message: 'Unable to generate a unique slug.',
      },
      { status: 500 },
    );
  }

  await prisma.linkAnalytics.create({
    data: {
      linkId: link.id,
      totalClicks: 0,
    },
  });

  const cachePayload = {
    linkId: link.id,
    destinationUrl: link.destinationUrl,
    redirectType: link.redirectType,
    disabled: link.disabled,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
  };

  try {
    const redis = await ensureRedisConnection();
    await setCachedLink(redis, domain.id, link.slug, cachePayload);
  } catch {
    // Cache failures should not block link creation.
  }

  return NextResponse.json(
    {
      id: link.id,
      slug: link.slug,
      shortUrl: `https://${hostname}/${link.slug}`,
      destinationUrl: link.destinationUrl,
      redirectType: link.redirectType,
      immutable: link.immutable,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
      disabled: link.disabled,
      createdAt: link.createdAt.toISOString(),
      ...(warnings.length ? { warnings } : {}),
    },
    { status: 201 },
  );
}

function isUniqueConstraintError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return 'code' in error && error.code === 'P2002';
}
