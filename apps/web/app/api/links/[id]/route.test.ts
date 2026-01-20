import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "./route";

const prismaMock = vi.hoisted(() => ({
  domain: {
    findFirst: vi.fn(),
  },
  link: {
    findFirst: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

const redisMock = vi.hoisted(() => ({
  del: vi.fn().mockResolvedValue(1),
  set: vi.fn().mockResolvedValue("OK"),
}));

vi.mock("../../../../lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("../../../../lib/redis", () => ({
  ensureRedisConnection: vi.fn(async () => redisMock),
}));

describe("PATCH /api/links/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEFAULT_DOMAIN_HOSTNAME = "example.com";
    prismaMock.domain.findFirst.mockResolvedValue({ id: "domain_1" });
  });

  it("updates destinationUrl for a mutable link and refreshes cache", async () => {
    prismaMock.link.findFirst.mockResolvedValue({
      id: "link_1",
      slug: "slug-1",
      domainId: "domain_1",
      destinationUrl: "https://example.com/old",
      redirectType: 302,
      immutable: false,
      expiresAt: null,
      disabled: false,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });
    prismaMock.link.update.mockResolvedValue({
      id: "link_1",
      slug: "slug-1",
      domainId: "domain_1",
      destinationUrl: "https://example.com/new",
      redirectType: 302,
      immutable: false,
      expiresAt: null,
      disabled: false,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    const request = new Request("http://localhost/api/links/link_1", {
      method: "PATCH",
      body: JSON.stringify({ destinationUrl: "example.com/new" }),
    });

    const response = await PATCH(request, { params: { id: "link_1" } });
    expect(response.status).toBe(200);
    expect(redisMock.del).toHaveBeenCalledWith("link:domain_1:slug-1");
    expect(redisMock.set).toHaveBeenCalledWith(
      "link:domain_1:slug-1",
      expect.stringContaining('"destinationUrl":"https://example.com/new"'),
      { EX: 60 * 60 * 24 },
    );
  });

  it("rejects destinationUrl update for immutable links", async () => {
    prismaMock.link.findFirst.mockResolvedValue({
      id: "link_immutable",
      slug: "slug-immutable",
      domainId: "domain_1",
      destinationUrl: "https://example.com/",
      redirectType: 301,
      immutable: true,
      expiresAt: null,
      disabled: false,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    const request = new Request("http://localhost/api/links/link_immutable", {
      method: "PATCH",
      body: JSON.stringify({ destinationUrl: "example.com/new" }),
    });

    const response = await PATCH(request, {
      params: { id: "link_immutable" },
    });

    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.errorCode).toBe("immutable_link");
  });

  it("forces immutable when redirectType is 308", async () => {
    prismaMock.link.findFirst.mockResolvedValue({
      id: "link_308",
      slug: "slug-308",
      domainId: "domain_1",
      destinationUrl: "https://example.com/",
      redirectType: 302,
      immutable: false,
      expiresAt: null,
      disabled: false,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });
    prismaMock.link.update.mockResolvedValue({
      id: "link_308",
      slug: "slug-308",
      domainId: "domain_1",
      destinationUrl: "https://example.com/",
      redirectType: 308,
      immutable: true,
      expiresAt: null,
      disabled: false,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    const request = new Request("http://localhost/api/links/link_308", {
      method: "PATCH",
      body: JSON.stringify({ redirectType: 308 }),
    });

    const response = await PATCH(request, { params: { id: "link_308" } });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.immutable).toBe(true);
    expect(payload.warnings).toEqual(expect.arrayContaining(["Immutable redirect enforced for 301/308."]));
  });
});

describe("DELETE /api/links/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEFAULT_DOMAIN_HOSTNAME = "example.com";
    prismaMock.domain.findFirst.mockResolvedValue({ id: "domain_1" });
  });

  it("deletes a link and clears cache", async () => {
    prismaMock.link.findFirst.mockResolvedValue({
      id: "link_delete",
      slug: "delete-me",
      domainId: "domain_1",
    });
    prismaMock.link.delete.mockResolvedValue({ id: "link_delete" });

    const response = await DELETE(new Request("http://localhost/api/links/link_delete"), {
      params: { id: "link_delete" },
    });

    expect(response.status).toBe(204);
    expect(redisMock.del).toHaveBeenCalledWith("link:domain_1:delete-me");
  });

  it("returns 404 when link is missing", async () => {
    prismaMock.link.findFirst.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/links/missing"), {
      params: { id: "missing" },
    });

    expect(response.status).toBe(404);
    const payload = await response.json();
    expect(payload.errorCode).toBe("not_found");
  });
});
