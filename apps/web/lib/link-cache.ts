export const LINK_CACHE_TTL_SECONDS = 60 * 60 * 24;
export const LINK_MISSING_SENTINEL = '__missing__';
export const LINK_MISSING_TTL_SECONDS = 60;

export type CachedLink = {
  linkId: string;
  destinationUrl: string;
  redirectType: number;
  disabled: boolean;
  expiresAt: string | null;
};

export function buildLinkCacheKey(domainId: string, slug: string) {
  return `link:${domainId}:${slug}`;
}

export async function getCachedLink(
  redis: { get: (key: string) => Promise<string | null> },
  domainId: string,
  slug: string,
): Promise<
  | { kind: 'hit'; value: CachedLink }
  | { kind: 'missing' }
  | { kind: 'miss' }
> {
  const value = await redis.get(buildLinkCacheKey(domainId, slug));

  if (value === null) {
    return { kind: 'miss' };
  }

  if (value === LINK_MISSING_SENTINEL) {
    return { kind: 'missing' };
  }

  try {
    return { kind: 'hit', value: JSON.parse(value) as CachedLink };
  } catch {
    return { kind: 'miss' };
  }
}

export async function setCachedLink(
  redis: { set: (key: string, value: string, options: { EX: number }) => Promise<unknown> },
  domainId: string,
  slug: string,
  value: CachedLink,
) {
  await redis.set(buildLinkCacheKey(domainId, slug), JSON.stringify(value), {
    EX: LINK_CACHE_TTL_SECONDS,
  });
}

export async function setMissing(
  redis: { set: (key: string, value: string, options: { EX: number }) => Promise<unknown> },
  domainId: string,
  slug: string,
) {
  await redis.set(buildLinkCacheKey(domainId, slug), LINK_MISSING_SENTINEL, {
    EX: LINK_MISSING_TTL_SECONDS,
  });
}

export async function invalidateCachedLink(
  redis: { del: (key: string) => Promise<unknown> },
  domainId: string,
  slug: string,
) {
  await redis.del(buildLinkCacheKey(domainId, slug));
}
