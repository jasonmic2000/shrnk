type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      retryAfter: number;
    };

type RedisRateClient = {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number | boolean>;
  ttl: (key: string) => Promise<number>;
};

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }

  return "unknown";
}

export function buildRateLimitKey(scope: "api" | "redirect", ip: string) {
  return `ratelimit:${scope}:${ip}`;
}

export async function rateLimit(
  redis: RedisRateClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (count > limit) {
      let retryAfter = windowSeconds;
      try {
        const ttl = await redis.ttl(key);
        if (ttl > 0) {
          retryAfter = ttl;
        }
      } catch {
        // Keep default retryAfter when ttl fails.
      }
      return { allowed: false, retryAfter };
    }
  } catch {
    return { allowed: true };
  }

  return { allowed: true };
}
