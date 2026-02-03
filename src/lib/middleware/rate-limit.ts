// In-memory rate limiting for API protection
// Production note: Use Redis or similar distributed cache for multi-instance deployments

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT = 20; // requests per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds

export function checkRateLimit(ip: string): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  // Clean expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    cleanupExpiredEntries(now);
  }

  if (!userLimit || now > userLimit.resetTime) {
    // No existing limit or expired - create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    rateLimitMap.set(ip, newEntry);

    return {
      allowed: true,
      limit: RATE_LIMIT,
      remaining: RATE_LIMIT - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Check if limit exceeded
  if (userLimit.count >= RATE_LIMIT) {
    return {
      allowed: false,
      limit: RATE_LIMIT,
      remaining: 0,
      resetTime: userLimit.resetTime,
    };
  }

  // Increment count
  userLimit.count++;

  return {
    allowed: true,
    limit: RATE_LIMIT,
    remaining: RATE_LIMIT - userLimit.count,
    resetTime: userLimit.resetTime,
  };
}

function cleanupExpiredEntries(now: number): void {
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

export function getRateLimitHeaders(rateLimitResult: ReturnType<typeof checkRateLimit>) {
  return {
    'X-RateLimit-Limit': rateLimitResult.limit.toString(),
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
  };
}

// Helper to get client IP from NextRequest
export function getClientIP(request: Request): string {
  // Check various headers in order of preference
  const headers = request.headers;

  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    headers.get('x-client-ip') ||
    'unknown'
  );
}
