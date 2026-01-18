import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  domain: {
    findFirst: vi.fn(),
  },
  link: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
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

import { GET, POST } from './route';

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

describe('GET /api/links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEFAULT_DOMAIN_HOSTNAME = 'example.com';
    prismaMock.domain.findFirst.mockResolvedValue({ id: 'domain_1' });
  });

  it('returns newest-first ordering', async () => {
    prismaMock.link.findMany.mockResolvedValue([
      {
        id: 'link_new',
        slug: 'new',
        destinationUrl: 'https://example.com/new',
        redirectType: 302,
        immutable: false,
        expiresAt: null,
        disabled: false,
        createdAt: new Date('2024-02-01T00:00:00Z'),
        analytics: {
          totalClicks: 2n,
          lastClickedAt: null,
        },
      },
      {
        id: 'link_old',
        slug: 'old',
        destinationUrl: 'https://example.com/old',
        redirectType: 302,
        immutable: false,
        expiresAt: null,
        disabled: false,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        analytics: {
          totalClicks: 5n,
          lastClickedAt: new Date('2024-02-02T00:00:00Z'),
        },
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/links?limit=2'),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.items.map((item: { id: string }) => item.id)).toEqual([
      'link_new',
      'link_old',
    ]);
  });

  it('paginates with cursor and returns nextCursor', async () => {
    prismaMock.link.findMany.mockResolvedValue([
      {
        id: 'link_3',
        slug: 'three',
        destinationUrl: 'https://example.com/three',
        redirectType: 302,
        immutable: false,
        expiresAt: null,
        disabled: false,
        createdAt: new Date('2024-03-01T00:00:00Z'),
        analytics: {
          totalClicks: 0n,
          lastClickedAt: null,
        },
      },
      {
        id: 'link_2',
        slug: 'two',
        destinationUrl: 'https://example.com/two',
        redirectType: 302,
        immutable: false,
        expiresAt: null,
        disabled: false,
        createdAt: new Date('2024-02-01T00:00:00Z'),
        analytics: {
          totalClicks: 0n,
          lastClickedAt: null,
        },
      },
      {
        id: 'link_1',
        slug: 'one',
        destinationUrl: 'https://example.com/one',
        redirectType: 302,
        immutable: false,
        expiresAt: null,
        disabled: false,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        analytics: {
          totalClicks: 0n,
          lastClickedAt: null,
        },
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/links?limit=2&cursor=link_4'),
    );

    const payload = await response.json();
    expect(payload.items).toHaveLength(2);
    expect(payload.nextCursor).toBe('link_2');
  });

  it('includes analytics when present', async () => {
    prismaMock.link.findMany.mockResolvedValue([
      {
        id: 'link_analytics',
        slug: 'analytics',
        destinationUrl: 'https://example.com/analytics',
        redirectType: 302,
        immutable: false,
        expiresAt: null,
        disabled: false,
        createdAt: new Date('2024-04-01T00:00:00Z'),
        analytics: {
          totalClicks: 9n,
          lastClickedAt: new Date('2024-04-02T00:00:00Z'),
        },
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/links?limit=1'),
    );

    const payload = await response.json();
    expect(payload.items[0].analytics).toEqual({
      totalClicks: 9,
      lastClickedAt: '2024-04-02T00:00:00.000Z',
    });
  });
});
