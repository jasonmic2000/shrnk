import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const prismaMock = vi.hoisted(() => ({
  domain: {
    findFirst: vi.fn(),
  },
  link: {
    findFirst: vi.fn(),
  },
}));

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  incr: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("../../lib/redis", () => ({
  ensureRedisConnection: vi.fn(async () => redisMock),
}));

describe("GET /:slug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEFAULT_DOMAIN_HOSTNAME = "example.com";
    prismaMock.domain.findFirst.mockResolvedValue({ id: "domain_1" });
  });

  it("redirects with 302 on happy path", async () => {
    redisMock.get.mockResolvedValue(null);
    prismaMock.link.findFirst.mockResolvedValue({
      id: "link_1",
      destinationUrl: "https://example.com/",
      redirectType: 302,
      disabled: false,
      expiresAt: null,
    });

    const response = await GET(new Request("http://localhost/foo"), {
      params: { slug: "foo" },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://example.com/");
  });

  it("returns 404 when link is missing", async () => {
    redisMock.get.mockResolvedValue(null);
    prismaMock.link.findFirst.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/missing"), {
      params: { slug: "missing" },
    });

    expect(response.status).toBe(404);
  });

  it("returns 410 when link is disabled", async () => {
    redisMock.get.mockResolvedValue(
      JSON.stringify({
        linkId: "link_disabled",
        destinationUrl: "https://example.com/",
        redirectType: 302,
        disabled: true,
        expiresAt: null,
      }),
    );

    const response = await GET(new Request("http://localhost/disabled"), {
      params: { slug: "disabled" },
    });

    expect(response.status).toBe(410);
  });

  it("returns 410 when link is expired", async () => {
    redisMock.get.mockResolvedValue(
      JSON.stringify({
        linkId: "link_expired",
        destinationUrl: "https://example.com/",
        redirectType: 302,
        disabled: false,
        expiresAt: "2020-01-01T00:00:00Z",
      }),
    );

    const response = await GET(new Request("http://localhost/expired"), {
      params: { slug: "expired" },
    });

    expect(response.status).toBe(410);
  });

  it("redirects with 308 from cached link", async () => {
    redisMock.get.mockResolvedValue(
      JSON.stringify({
        linkId: "link_cached",
        destinationUrl: "https://example.com/cached",
        redirectType: 308,
        disabled: false,
        expiresAt: null,
      }),
    );

    const response = await GET(new Request("http://localhost/cached"), {
      params: { slug: "cached" },
    });

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://example.com/cached");
  });
});
