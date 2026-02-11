import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { Difficulty } from '@/lib/supabase/types';

// =============================================================================
// RATING SERVICE - Chester AI Chess
// =============================================================================
// Standard Elo rating system with K=32 (developing players).
// Drives automatic difficulty selection based on player skill band.
// =============================================================================

/** K-factor for rating adjustments (32 = developing players, standard chess) */
const K_FACTOR = 32;

/** Minimum rating floor — can never drop below this */
const RATING_FLOOR = 100;

/** Default starting Elo for new players */
export const DEFAULT_RATING = 1200;

/** Engine Elo estimates by difficulty band */
const ENGINE_RATINGS: Record<Difficulty, number> = {
  easy: 800,
  medium: 1200,
  hard: 1600,
};

/** Difficulty band thresholds */
const DIFFICULTY_THRESHOLDS = {
  easy: { max: 999 },
  medium: { min: 1000, max: 1399 },
  hard: { min: 1400 },
} as const;

// =============================================================================
// PURE ELO MATH
// =============================================================================

/**
 * Calculate the expected score using standard Elo formula.
 * E = 1 / (1 + 10^((opponent - player) / 400))
 */
function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculate new rating after a game result.
 * @param playerRating  Current player Elo
 * @param engineRating  Estimated engine Elo for the difficulty played
 * @param result        1 = win, 0 = loss, 0.5 = draw
 * @returns New rating (floored at RATING_FLOOR)
 */
export function calculateNewRating(
  playerRating: number,
  engineRating: number,
  result: 0 | 0.5 | 1,
): number {
  const expected = expectedScore(playerRating, engineRating);
  const newRating = Math.round(playerRating + K_FACTOR * (result - expected));
  return Math.max(RATING_FLOOR, newRating);
}

// =============================================================================
// DIFFICULTY MAPPING
// =============================================================================

/**
 * Get the estimated Elo for a given difficulty level.
 */
export function getEngineRating(difficulty: Difficulty): number {
  return ENGINE_RATINGS[difficulty];
}

/**
 * Map a player's rating to the appropriate difficulty band.
 * < 1000  → easy (engine ~800)
 * 1000–1399 → medium (engine ~1200)
 * 1400+  → hard (engine ~1600)
 */
export function getDifficultyForRating(playerRating: number): Difficulty {
  if (playerRating < (DIFFICULTY_THRESHOLDS.medium.min)) return 'easy';
  if (playerRating < (DIFFICULTY_THRESHOLDS.hard.min)) return 'medium';
  return 'hard';
}

// =============================================================================
// DATABASE UPDATE
// =============================================================================

/**
 * Persist the player's new rating to user_profiles via Supabase.
 * Uses the browser client (called from client components).
 */
export async function updatePlayerRating(userId: string, newRating: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ rating: newRating })
    .eq('id', userId);

  if (error) {
    console.error('[RatingService] Error updating player rating:', error);
    throw error;
  }

  console.log(`[RatingService] Updated rating for ${userId}: ${newRating}`);
}
