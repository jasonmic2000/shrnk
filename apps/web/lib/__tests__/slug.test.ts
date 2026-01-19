import { describe, expect, it } from "vitest";

import { generateSlugBase58, normalizeAndValidateCustomSlug } from "../slug";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

describe("generateSlugBase58", () => {
  it("returns the requested length", () => {
    const slug = generateSlugBase58(10);
    expect(slug).toHaveLength(10);
  });

  it("uses only Base58 characters", () => {
    const slug = generateSlugBase58(32);
    for (const char of slug) {
      expect(BASE58_ALPHABET.includes(char)).toBe(true);
    }
  });

  it("generates different values across many calls", () => {
    const results = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      results.add(generateSlugBase58());
    }
    expect(results.size).toBeGreaterThan(190);
  });
});

describe("normalizeAndValidateCustomSlug", () => {
  it("accepts valid slugs and lowercases input", () => {
    const result = normalizeAndValidateCustomSlug("My-Slug-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slug).toBe("my-slug-1");
    }
  });

  it("rejects reserved words", () => {
    const result = normalizeAndValidateCustomSlug("ADMIN");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("RESERVED");
    }
  });

  it("rejects invalid characters", () => {
    const result = normalizeAndValidateCustomSlug("bad_slug");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("INVALID_CHARS");
    }
  });

  it("rejects leading or trailing dashes", () => {
    const leading = normalizeAndValidateCustomSlug("-slug");
    const trailing = normalizeAndValidateCustomSlug("slug-");
    expect(leading.ok).toBe(false);
    expect(trailing.ok).toBe(false);
  });

  it("rejects consecutive dashes", () => {
    const result = normalizeAndValidateCustomSlug("bad--slug");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("CONSECUTIVE_DASH");
    }
  });

  it("rejects empty slugs", () => {
    const result = normalizeAndValidateCustomSlug("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("EMPTY");
    }
  });

  it("rejects overly long slugs", () => {
    const longSlug = "a".repeat(65);
    const result = normalizeAndValidateCustomSlug(longSlug);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("TOO_LONG");
    }
  });
});
