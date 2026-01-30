import { Redis } from '@upstash/redis';

// =============================================================================
// UPSTASH REDIS CLIENT - Chester AI Chess
// =============================================================================
// Connectionless HTTP-based Redis client optimized for serverless
// =============================================================================

let redisInstance: Redis | null = null;

/**
 * Get the Redis client singleton
 * Uses environment variables: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */
export function getRedisClient(): Redis {
  if (!redisInstance) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        'Missing Redis environment variables. ' +
        'Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your .env.local file.'
      );
    }

    redisInstance = new Redis({
      url,
      token,
      automaticDeserialization: true,
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(Math.exp(retryCount) * 50, 1000),
      },
    });

    console.log('[Redis] Client initialized');
  }

  return redisInstance;
}

/**
 * Safe Redis client that returns null if not configured
 * Use this for optional Redis features that should degrade gracefully
 */
export function getRedisClientSafe(): Redis | null {
  try {
    return getRedisClient();
  } catch {
    console.warn('[Redis] Not configured, falling back to in-memory');
    return null;
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const redis = getRedisClientSafe();
    if (!redis) return false;

    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

// Re-export Redis type for convenience
export { Redis } from '@upstash/redis';
