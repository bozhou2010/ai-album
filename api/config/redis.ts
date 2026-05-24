import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    return Math.min(times * 200, 5000);
  },
  reconnectOnError(err: Error) {
    return err.message.includes('READONLY');
  },
  enableReadyCheck: true,
  lazyConnect: true,
});

export { redis };

export async function publishSSE(userId: string, event: string, data: unknown) {
  await redis.publish(`sse:${userId}`, JSON.stringify({ event, data }));
}
