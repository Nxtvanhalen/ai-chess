import { getRedisClientSafe } from './client';

// =============================================================================
// CACHE SERVICE - Chester AI Chess
// =============================================================================
// Redis-based caching for frequently accessed data
// =============================================================================

// Cache key prefixes
const CACHE_KEYS = {
  session: 'cache:session:',
  gameState: 'cache:game:state:',
  gameContext: 'cache:game:context:',
  userProfile: 'cache:user:profile:',
  chesterPersonality: 'cache:chester:personality:',
  engineTransposition: 'cache:engine:tt:',
} as const;

// Default TTLs in seconds
const DEFAULT_TTLS = {
  session: 60 * 60, // 1 hour
  gameState: 60 * 30, // 30 minutes
  gameContext: 60 * 10, // 10 minutes
  userProfile: 60 * 60 * 24, // 24 hours
  chesterPersonality: 60 * 60, // 1 hour
  engineTransposition: 60 * 60 * 2, // 2 hours
} as const;

// -----------------------------------------------------------------------------
// GENERIC CACHE OPERATIONS
// -----------------------------------------------------------------------------

/**
 * Get a cached value
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedisClientSafe();
  if (!redis) return null;

  try {
    const value = await redis.get(key);
    if (value === null) return null;

    return value as T;
  } catch (error) {
    console.error('[Cache] Get error:', error);
    return null;
  }
}

/**
 * Set a cached value with optional TTL
 */
export async function setCached<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
  const redis = getRedisClientSafe();
  if (!redis) return false;

  try {
    if (ttlSeconds) {
      await redis.set(key, value as any, { ex: ttlSeconds });
    } else {
      await redis.set(key, value as any);
    }
    return true;
  } catch (error) {
    console.error('[Cache] Set error:', error);
    return false;
  }
}

/**
 * Delete a cached value
 */
export async function deleteCached(key: string): Promise<boolean> {
  const redis = getRedisClientSafe();
  if (!redis) return false;

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('[Cache] Delete error:', error);
    return false;
  }
}

/**
 * Get or set pattern - fetch from cache or compute and cache
 */
export async function getOrSet<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttlSeconds?: number,
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  const computed = await computeFn();
  await setCached(key, computed, ttlSeconds);
  return computed;
}

// -----------------------------------------------------------------------------
// SESSION CACHING
// -----------------------------------------------------------------------------

export interface CachedSession {
  userId: string;
  email: string;
  expiresAt: number;
}

export async function getCachedSession(userId: string): Promise<CachedSession | null> {
  return getCached<CachedSession>(`${CACHE_KEYS.session}${userId}`);
}

export async function setCachedSession(userId: string, session: CachedSession): Promise<boolean> {
  return setCached(`${CACHE_KEYS.session}${userId}`, session, DEFAULT_TTLS.session);
}

export async function deleteCachedSession(userId: string): Promise<boolean> {
  return deleteCached(`${CACHE_KEYS.session}${userId}`);
}

// -----------------------------------------------------------------------------
// GAME STATE CACHING
// -----------------------------------------------------------------------------

export interface CachedGameState {
  gameId: string;
  fen: string;
  turn: 'w' | 'b';
  moveCount: number;
  lastMove?: string;
  isGameOver: boolean;
  updatedAt: number;
}

export async function getCachedGameState(gameId: string): Promise<CachedGameState | null> {
  return getCached<CachedGameState>(`${CACHE_KEYS.gameState}${gameId}`);
}

export async function setCachedGameState(gameId: string, state: CachedGameState): Promise<boolean> {
  return setCached(`${CACHE_KEYS.gameState}${gameId}`, state, DEFAULT_TTLS.gameState);
}

export async function deleteCachedGameState(gameId: string): Promise<boolean> {
  return deleteCached(`${CACHE_KEYS.gameState}${gameId}`);
}

// -----------------------------------------------------------------------------
// GAME CONTEXT CACHING (for Chester's memory)
// -----------------------------------------------------------------------------

export interface CachedGameContext {
  totalMoves: number;
  tacticalThemes: string[];
  recentMoves: Array<{ san: string; playerType: string }>;
  narrative?: string;
  cachedAt: number;
}

export async function getCachedGameContext(gameId: string): Promise<CachedGameContext | null> {
  return getCached<CachedGameContext>(`${CACHE_KEYS.gameContext}${gameId}`);
}

export async function setCachedGameContext(
  gameId: string,
  context: CachedGameContext,
): Promise<boolean> {
  return setCached(`${CACHE_KEYS.gameContext}${gameId}`, context, DEFAULT_TTLS.gameContext);
}

// -----------------------------------------------------------------------------
// USER PROFILE CACHING
// -----------------------------------------------------------------------------

export interface CachedUserProfile {
  userId: string;
  email: string;
  displayName?: string;
  subscriptionTier?: 'free' | 'pro' | 'premium';
  gamesPlayed: number;
  cachedAt: number;
}

export async function getCachedUserProfile(userId: string): Promise<CachedUserProfile | null> {
  return getCached<CachedUserProfile>(`${CACHE_KEYS.userProfile}${userId}`);
}

export async function setCachedUserProfile(
  userId: string,
  profile: CachedUserProfile,
): Promise<boolean> {
  return setCached(`${CACHE_KEYS.userProfile}${userId}`, profile, DEFAULT_TTLS.userProfile);
}

export async function deleteCachedUserProfile(userId: string): Promise<boolean> {
  return deleteCached(`${CACHE_KEYS.userProfile}${userId}`);
}

// -----------------------------------------------------------------------------
// CHESTER PERSONALITY CACHING
// -----------------------------------------------------------------------------

export interface CachedChesterPersonality {
  rapportLevel: number;
  gamesPlayed: number;
  recentPerformance: string;
  currentStreak: number;
  commonMistakes: string[];
  strongAreas: string[];
  cachedAt: number;
}

export async function getCachedChesterPersonality(
  userId: string,
): Promise<CachedChesterPersonality | null> {
  return getCached<CachedChesterPersonality>(`${CACHE_KEYS.chesterPersonality}${userId}`);
}

export async function setCachedChesterPersonality(
  userId: string,
  personality: CachedChesterPersonality,
): Promise<boolean> {
  return setCached(
    `${CACHE_KEYS.chesterPersonality}${userId}`,
    personality,
    DEFAULT_TTLS.chesterPersonality,
  );
}

// -----------------------------------------------------------------------------
// CACHE STATISTICS (for monitoring)
// -----------------------------------------------------------------------------

export async function getCacheStats(): Promise<{
  available: boolean;
  memoryUsage?: string;
}> {
  const redis = getRedisClientSafe();
  if (!redis) {
    return { available: false };
  }

  try {
    // Use ping to check availability (Upstash REST API doesn't support INFO)
    await redis.ping();
    return {
      available: true,
      memoryUsage: 'See Upstash dashboard for details',
    };
  } catch {
    return { available: false };
  }
}
