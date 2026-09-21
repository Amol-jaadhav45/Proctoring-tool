import { createClient, RedisClientType } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let publisher: RedisClientType | null = null;
let subscriber: RedisClientType | null = null;

export const initEventBus = async (): Promise<void> => {
  if (!process.env.REDIS_URL) {
    console.warn('[event-bus] REDIS_URL not set – skipping Redis connection');
    return;
  }
  try {
    publisher = createClient({ url: redisUrl }) as RedisClientType;
    subscriber = createClient({ url: redisUrl }) as RedisClientType;
    await publisher.connect();
    await subscriber.connect();
    console.log('[event-bus] Connected to Redis');

    await subscriber.pSubscribe('exam.events.*', (message, channel) => {
      console.log(`[event-bus] Received on ${channel}:`, message);
    });
  } catch (err) {
    console.error('[event-bus] Failed to connect to Redis:', err);
    publisher = null;
    subscriber = null;
  }
};

export const publishEvent = async (channel: string, message: unknown): Promise<void> => {
  if (!publisher) return;
  try {
    await publisher.publish(channel, JSON.stringify(message));
  } catch (err) {
    console.error('[event-bus] Publish failed:', err);
  }
};
