import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  domain: {
    findFirst: vi.fn(),
  },
  link: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  linkAnalytics: {
    create: vi.fn(),
  },
}));

const redisMock = vi.hoisted(() => ({
  set: vi.fn().mockResolvedValue('OK'),
}));

vi.mock('../../../lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('../../../lib/redis', () => ({
  ensureRedisConnection: vi.fn(async () => redisMock),
}));

vi.mock('../../../lib/slug', async () => {
  const actual =
    await vi.importActual<typeof import('../../../lib/slug')>(
      '../../../lib/slug',
    );
  return {
    ...actual,
    generateSlugBase58: vi.fn(() => 'rand123'),
  };
});

import { POST } from './route';

describe('POST /api/links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEFAULT_DOMAIN_HOSTNAME = 'example.com';
    prismaMock.domain.findFirst.mockResolvedValue({ id: 'domain_1' });
  });

  it('creates a link with a random slug', async () => {
    prismaMock.link.create.mockResolvedValue({
      id: 'link_1',
      slug: 'rand123',
      destinationUrl: 'https://example.com/',
      redirectType: 302,
      immutable: false,
      expiresAt: null,
      disabled: false,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    });
    prismaMock.linkAnalytics.create.mockResolvedValue({ linkId: 'link_1' });

    const request = new Request('http://localhost/api/links', {
      method: 'POST',
      body: JSON.stringify({ destinationUrl: 'example.com' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.slug).toBe('rand123');
    expect(payload.shortUrl).toBe('https://example.com/rand123');
  });

  it('creates a link with a custom slug', async () => {
    prismaMock.link.findFirst.mockResolvedValue(null);
    prismaMock.link.create.mockResolvedValue({
      id: 'link_2',
      slug: 'custom-slug',
      destinationUrl: 'https://example.com/',
      redirectType: 302,
      immutable: false,
      expiresAt: null,
      disabled: false,
      createdAt: new Date('2024-01-02T00:00:00Z'),
    });
    prismaMock.linkAnalytics.create.mockResolvedValue({ linkId: 'link_2' });

    const request = new Request('http://localhost/api/links', {
      method: 'POST',
      body: JSON.stringify({
        destinationUrl: 'example.com',
        slug: 'Custom-Slug',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.slug).toBe('custom-slug');
  });

  it('returns 409 when custom slug is taken', async () => {
    prismaMock.link.findFirst.mockResolvedValue({ id: 'link_existing' });

    const request = new Request('http://localhost/api/links', {
      method: 'POST',
      body: JSON.stringify({
        destinationUrl: 'example.com',
        slug: 'taken',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.errorCode).toBe('slug_taken');
  });

  it('forces immutable for redirect type 301 with warning', async () => {
    prismaMock.link.findFirst.mockResolvedValue(null);
    prismaMock.link.create.mockResolvedValue({
      id: 'link_3',
      slug: 'custom-301',
      destinationUrl: 'https://example.com/',
      redirectType: 301,
      immutable: true,
      expiresAt: null,
      disabled: false,
      createdAt: new Date('2024-01-03T00:00:00Z'),
    });
    prismaMock.linkAnalytics.create.mockResolvedValue({ linkId: 'link_3' });

    const request = new Request('http://localhost/api/links', {
      method: 'POST',
      body: JSON.stringify({
        destinationUrl: 'example.com',
        slug: 'custom-301',
        redirectType: 301,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.immutable).toBe(true);
    expect(payload.warnings).toEqual(
      expect.arrayContaining(['Immutable redirect enforced for 301/308.']),
    );
  });
});
