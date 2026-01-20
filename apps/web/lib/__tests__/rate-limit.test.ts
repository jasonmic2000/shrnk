import { describe, expect, it } from "vitest";

import { rateLimit } from "../rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit", async () => {
    const redis = {
      incr: async () => 1,
      expire: async () => 1,
      ttl: async () => 60,
    };

    const result = await rateLimit(redis, "ratelimit:api:ip", 2, 60);
    expect(result.allowed).toBe(true);
  });

  it("rejects requests over the limit", async () => {
    const redis = {
      incr: async () => 5,
      expire: async () => 1,
      ttl: async () => 30,
    };

    const result = await rateLimit(redis, "ratelimit:api:ip", 2, 60);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfter).toBe(30);
    }
  });

  it("allows requests when redis fails", async () => {
    const redis = {
      incr: async () => {
        throw new Error("redis down");
      },
      expire: async () => 1,
      ttl: async () => 60,
    };

    const result = await rateLimit(redis, "ratelimit:api:ip", 2, 60);
    expect(result.allowed).toBe(true);
  });
});
