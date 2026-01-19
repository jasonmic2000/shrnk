import { createClient, type RedisClientType } from "redis";

const globalForRedis = globalThis as unknown as { redis?: RedisClientType };

function createRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }

  return createClient({ url });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function ensureRedisConnection() {
  if (!redis.isOpen) {
    await redis.connect();
  }

  return redis;
}
