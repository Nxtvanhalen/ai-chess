import { getRedisClientSafe } from './client';

// =============================================================================
// GUARDIAN SERVICE - Chester AI Chess
// =============================================================================
// IP blocking and threat detection
// Currently uses static blocklist, prepared for Redis integration
// =============================================================================

// Redis key prefixes for Guardian data
const REDIS_KEYS = {
  blockedIPs: 'guardian:blocked:ips',
  blockedSubnets: 'guardian:blocked:subnets',
  threatLog: 'guardian:threats:log',
  ipReputation: 'guardian:reputation:',
} as const;

// -----------------------------------------------------------------------------
// REDIS-BASED GUARDIAN (Future)
// -----------------------------------------------------------------------------

/**
 * Check if an IP is blocked in Redis
 * Returns null if Redis is not available (fall back to static list)
 */
export async function isIPBlockedInRedis(ip: string): Promise<boolean | null> {
  const redis = getRedisClientSafe();
  if (!redis) return null;

  try {
    // Check direct IP block
    const isBlocked = await redis.sismember(REDIS_KEYS.blockedIPs, ip);
    if (isBlocked) return true;

    // TODO: Check subnet blocks when Guardian moves to Redis
    // This will involve storing subnets and checking IP membership

    return false;
  } catch (error) {
    console.error('[Guardian] Redis check failed:', error);
    return null;
  }
}

/**
 * Add an IP to the blocked list in Redis
 * Called by Guardian's AI analysis system
 */
export async function blockIPInRedis(
  ip: string,
  reason: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  ttl?: number, // Optional TTL in seconds (for temporary blocks)
): Promise<boolean> {
  const redis = getRedisClientSafe();
  if (!redis) return false;

  try {
    // Add to blocked set
    await redis.sadd(REDIS_KEYS.blockedIPs, ip);

    // Log the threat
    await redis.lpush(
      REDIS_KEYS.threatLog,
      JSON.stringify({
        ip,
        reason,
        severity,
        blockedAt: new Date().toISOString(),
        ttl: ttl || 'permanent',
      }),
    );

    // Trim log to last 1000 entries
    await redis.ltrim(REDIS_KEYS.threatLog, 0, 999);

    // If TTL specified, set expiry (move to separate key for temp blocks)
    if (ttl) {
      await redis.set(`guardian:tempblock:${ip}`, reason, { ex: ttl });
    }

    console.log(`[Guardian] Blocked IP ${ip}: ${reason} (${severity})`);
    return true;
  } catch (error) {
    console.error('[Guardian] Failed to block IP:', error);
    return false;
  }
}

/**
 * Remove an IP from the blocked list
 */
export async function unblockIPInRedis(ip: string): Promise<boolean> {
  const redis = getRedisClientSafe();
  if (!redis) return false;

  try {
    await redis.srem(REDIS_KEYS.blockedIPs, ip);
    console.log(`[Guardian] Unblocked IP ${ip}`);
    return true;
  } catch (error) {
    console.error('[Guardian] Failed to unblock IP:', error);
    return false;
  }
}

/**
 * Get all blocked IPs from Redis
 */
export async function getBlockedIPsFromRedis(): Promise<string[]> {
  const redis = getRedisClientSafe();
  if (!redis) return [];

  try {
    const ips = await redis.smembers(REDIS_KEYS.blockedIPs);
    return ips as string[];
  } catch (error) {
    console.error('[Guardian] Failed to get blocked IPs:', error);
    return [];
  }
}

/**
 * Get recent threat log entries
 */
export async function getRecentThreats(count: number = 50): Promise<unknown[]> {
  const redis = getRedisClientSafe();
  if (!redis) return [];

  try {
    const logs = await redis.lrange(REDIS_KEYS.threatLog, 0, count - 1);
    return logs.map((log) => {
      try {
        return typeof log === 'string' ? JSON.parse(log) : log;
      } catch {
        return log;
      }
    });
  } catch (error) {
    console.error('[Guardian] Failed to get threat log:', error);
    return [];
  }
}

/**
 * Update IP reputation score
 * Used by AI analysis to track suspicious behavior over time
 */
export async function updateIPReputation(
  ip: string,
  delta: number, // Positive = more suspicious, negative = less suspicious
  reason: string,
): Promise<number | null> {
  const redis = getRedisClientSafe();
  if (!redis) return null;

  try {
    const key = `${REDIS_KEYS.ipReputation}${ip}`;
    const newScore = await redis.incrbyfloat(key, delta);

    // Set TTL of 7 days for reputation data
    await redis.expire(key, 60 * 60 * 24 * 7);

    // Log significant reputation changes
    if (Math.abs(delta) >= 10) {
      console.log(
        `[Guardian] IP ${ip} reputation: ${newScore} (${delta > 0 ? '+' : ''}${delta}: ${reason})`,
      );
    }

    return newScore;
  } catch (error) {
    console.error('[Guardian] Failed to update IP reputation:', error);
    return null;
  }
}

/**
 * Get IP reputation score
 */
export async function getIPReputation(ip: string): Promise<number> {
  const redis = getRedisClientSafe();
  if (!redis) return 0;

  try {
    const score = await redis.get(`${REDIS_KEYS.ipReputation}${ip}`);
    return typeof score === 'number' ? score : parseFloat(score as string) || 0;
  } catch {
    return 0;
  }
}

// -----------------------------------------------------------------------------
// GUARDIAN INTEGRATION HELPERS
// -----------------------------------------------------------------------------

/**
 * Check if should use Redis for Guardian
 * Returns true if Redis is available and has Guardian data
 */
export async function shouldUseRedisGuardian(): Promise<boolean> {
  const redis = getRedisClientSafe();
  if (!redis) return false;

  try {
    // Check if Guardian data exists in Redis
    const hasData = await redis.exists(REDIS_KEYS.blockedIPs);
    return hasData > 0;
  } catch {
    return false;
  }
}

/**
 * Sync static blocked IPs to Redis (one-time migration helper)
 */
export async function syncStaticBlocksToRedis(
  staticIPs: string[],
  staticSubnets: Array<{ base: string; mask: number; reason: string }>,
): Promise<boolean> {
  const redis = getRedisClientSafe();
  if (!redis) return false;

  try {
    // Add static IPs
    if (staticIPs.length > 0) {
      // Add IPs one at a time (Upstash REST API constraint)
      for (const ip of staticIPs) {
        await redis.sadd(REDIS_KEYS.blockedIPs, ip);
      }
    }

    // Store subnets as JSON (for future subnet checking)
    if (staticSubnets.length > 0) {
      await redis.set(REDIS_KEYS.blockedSubnets, JSON.stringify(staticSubnets));
    }

    console.log(
      `[Guardian] Synced ${staticIPs.length} IPs and ${staticSubnets.length} subnets to Redis`,
    );
    return true;
  } catch (error) {
    console.error('[Guardian] Failed to sync to Redis:', error);
    return false;
  }
}
