// =============================================================================
// REDIS MODULE - Chester AI Chess
// =============================================================================
// Centralized exports for Redis functionality
// =============================================================================

// Client
export {
  getRedisClient,
  getRedisClientSafe,
  isRedisAvailable,
  Redis,
} from './client';

// Rate Limiting
export {
  checkRateLimitRedis,
  getRateLimitHeadersRedis,
  getClientIPFromRequest,
  RATE_LIMITS,
  type RateLimitType,
  type RateLimitResult,
} from './ratelimit';

// Guardian (IP Blocking)
export {
  isIPBlockedInRedis,
  blockIPInRedis,
  unblockIPInRedis,
  getBlockedIPsFromRedis,
  getRecentThreats,
  updateIPReputation,
  getIPReputation,
  shouldUseRedisGuardian,
  syncStaticBlocksToRedis,
} from './guardian';

// Caching
export {
  getCached,
  setCached,
  deleteCached,
  getOrSet,
  getCachedSession,
  setCachedSession,
  deleteCachedSession,
  getCachedGameState,
  setCachedGameState,
  deleteCachedGameState,
  getCachedGameContext,
  setCachedGameContext,
  getCachedUserProfile,
  setCachedUserProfile,
  deleteCachedUserProfile,
  getCachedChesterPersonality,
  setCachedChesterPersonality,
  getCacheStats,
  type CachedSession,
  type CachedGameState,
  type CachedGameContext,
  type CachedUserProfile,
  type CachedChesterPersonality,
} from './cache';
