import { describe, expect, it } from "vitest";

import { normalizeAndValidateUrl } from "../url";

describe("normalizeAndValidateUrl", () => {
  it("adds https when scheme is missing", () => {
    const result = normalizeAndValidateUrl("example.com/path");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe("https://example.com/path");
    }
  });

  it("trims whitespace", () => {
    const result = normalizeAndValidateUrl("  https://example.com  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe("https://example.com/");
    }
  });

  it("lowercases the hostname", () => {
    const result = normalizeAndValidateUrl("https://ExAmple.Com/Path");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe("https://example.com/Path");
    }
  });

  it("strips default ports", () => {
    const httpResult = normalizeAndValidateUrl("http://example.com:80");
    const httpsResult = normalizeAndValidateUrl("https://example.com:443");
    expect(httpResult.ok).toBe(true);
    expect(httpsResult.ok).toBe(true);
    if (httpResult.ok) {
      expect(httpResult.url).toBe("http://example.com/");
    }
    if (httpsResult.ok) {
      expect(httpsResult.url).toBe("https://example.com/");
    }
  });

  it("rejects unsupported schemes", () => {
    const result = normalizeAndValidateUrl("javascript:alert(1)");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("INVALID_SCHEME");
    }
  });

  it("rejects invalid URLs", () => {
    const result = normalizeAndValidateUrl("http://");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("INVALID_URL");
    }
  });

  it("rejects overly long URLs", () => {
    const longHost = "a".repeat(2050);
    const result = normalizeAndValidateUrl(`${longHost}.com`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("TOO_LONG");
    }
  });
});
