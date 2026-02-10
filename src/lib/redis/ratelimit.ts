import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClientSafe } from './client';

// =============================================================================
// RATE LIMITING SERVICE - Chester AI Chess
// =============================================================================
// Distributed rate limiting using Upstash Redis
// Falls back to in-memory if Redis is not available
// =============================================================================

// -----------------------------------------------------------------------------
// RATE LIMIT CONFIGURATIONS
// -----------------------------------------------------------------------------

export const RATE_LIMITS = {
  // API endpoints - requests per minute
  chat: { requests: 20, window: '1 m' as const },
  aiMove: { requests: 30, window: '1 m' as const },
  moveAnalysis: { requests: 40, window: '1 m' as const },
  preMoveAnalysis: { requests: 40, window: '1 m' as const },

  // Auth endpoints - stricter limits
  login: { requests: 5, window: '1 m' as const },
  signup: { requests: 3, window: '1 m' as const },

  // Global fallback
  default: { requests: 60, window: '1 m' as const },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

// -----------------------------------------------------------------------------
// RATE LIMITER INSTANCES
// -----------------------------------------------------------------------------

let rateLimiters: Map<RateLimitType, Ratelimit> | null = null;

function getRateLimiters(): Map<RateLimitType, Ratelimit> | null {
  if (rateLimiters) return rateLimiters;

  const redis = getRedisClientSafe();
  if (!redis) return null;

  rateLimiters = new Map();

  for (const [key, config] of Object.entries(RATE_LIMITS)) {
    rateLimiters.set(
      key as RateLimitType,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        prefix: `chester:ratelimit:${key}`,
        analytics: true,
      }),
    );
  }

  console.log('[RateLimit] Redis-based rate limiters initialized');
  return rateLimiters;
}

// -----------------------------------------------------------------------------
// IN-MEMORY FALLBACK
// -----------------------------------------------------------------------------

interface InMemoryEntry {
  count: number;
  resetTime: number;
}

const inMemoryLimits = new Map<string, InMemoryEntry>();
const IN_MEMORY_MAX_SIZE = 10_000;

function checkInMemoryLimit(
  identifier: string,
  type: RateLimitType,
): { success: boolean; limit: number; remaining: number; reset: number } {
  const config = RATE_LIMITS[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();
  const windowMs = parseWindow(config.window);

  let entry = inMemoryLimits.get(key);

  // Cleanup expired entries when map grows large or occasionally
  if (inMemoryLimits.size >= IN_MEMORY_MAX_SIZE || Math.random() < 0.01) {
    for (const [k, v] of inMemoryLimits.entries()) {
      if (now > v.resetTime) inMemoryLimits.delete(k);
    }
  }

  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + windowMs };
    inMemoryLimits.set(key, entry);
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - 1,
      reset: entry.resetTime,
    };
  }

  if (entry.count >= config.requests) {
    return {
      success: false,
      limit: config.requests,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  entry.count++;
  return {
    success: true,
    limit: config.requests,
    remaining: config.requests - entry.count,
    reset: entry.resetTime,
  };
}

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 60000; // Default 1 minute

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 60000;
  }
}

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending?: Promise<unknown>;
}

/**
 * Check rate limit for an identifier
 * Uses Redis if available, falls back to in-memory
 */
export async function checkRateLimitRedis(
  identifier: string,
  type: RateLimitType = 'default',
): Promise<RateLimitResult> {
  const limiters = getRateLimiters();

  if (limiters) {
    const limiter = limiters.get(type) || limiters.get('default')!;
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      pending: result.pending,
    };
  }

  // Fallback to in-memory
  return checkInMemoryLimit(identifier, type);
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeadersRedis(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.reset / 1000).toString(),
  };
}

/**
 * Helper to extract client IP from request
 */
export function getClientIPFromRequest(request: Request): string {
  const headers = request.headers;

  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    headers.get('x-client-ip') ||
    'unknown'
  );
}
