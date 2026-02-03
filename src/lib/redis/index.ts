// =============================================================================
// REDIS MODULE - Chester AI Chess
// =============================================================================
// Centralized exports for Redis functionality
// =============================================================================

// Caching
export {
  type CachedChesterPersonality,
  type CachedGameContext,
  type CachedGameState,
  type CachedSession,
  type CachedUserProfile,
  deleteCached,
  deleteCachedGameState,
  deleteCachedSession,
  deleteCachedUserProfile,
  getCached,
  getCachedChesterPersonality,
  getCachedGameContext,
  getCachedGameState,
  getCachedSession,
  getCachedUserProfile,
  getCacheStats,
  getOrSet,
  setCached,
  setCachedChesterPersonality,
  setCachedGameContext,
  setCachedGameState,
  setCachedSession,
  setCachedUserProfile,
} from './cache';
// Client
export {
  getRedisClient,
  getRedisClientSafe,
  isRedisAvailable,
  Redis,
} from './client';

// Guardian (IP Blocking)
export {
  blockIPInRedis,
  getBlockedIPsFromRedis,
  getIPReputation,
  getRecentThreats,
  isIPBlockedInRedis,
  shouldUseRedisGuardian,
  syncStaticBlocksToRedis,
  unblockIPInRedis,
  updateIPReputation,
} from './guardian';
// Rate Limiting
export {
  checkRateLimitRedis,
  getClientIPFromRequest,
  getRateLimitHeadersRedis,
  RATE_LIMITS,
  type RateLimitResult,
  type RateLimitType,
} from './ratelimit';
