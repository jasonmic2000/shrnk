import { NextResponse } from 'next/server';

import { prisma } from '../../../lib/prisma';
import { ensureRedisConnection } from '../../../lib/redis';

type HealthStatus = {
  ok: boolean;
  db: 'ok' | 'error';
  redis: 'ok' | 'error';
};

export async function GET() {
  const status: HealthStatus = {
    ok: true,
    db: 'ok',
    redis: 'ok',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    status.ok = false;
    status.db = 'error';
  }

  try {
    const client = await ensureRedisConnection();
    const pong = await client.ping();
    if (pong !== 'PONG') {
      throw new Error('Unexpected Redis response');
    }
  } catch {
    status.ok = false;
    status.redis = 'error';
  }

  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
