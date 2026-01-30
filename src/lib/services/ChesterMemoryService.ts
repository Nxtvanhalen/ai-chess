/**
 * Chester Memory Service
 * Manages Chester's long-term learning and personality evolution
 */

import { supabase } from '../supabase/client';
import {
  ChesterLongTermMemory,
  PlayStyleProfile,
  RecentGameSummary,
  MemorableMoment,
  RelationshipMetrics,
  GameMemory
} from '@/types';

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

export class ChesterMemoryService {
  /**
   * Get or create Chester's long-term memory for a user
   */
  static async getOrCreateMemory(userId?: string | null): Promise<ChesterLongTermMemory | null> {
    // Anonymous users don't get long-term memory
    // Also validate that userId is a proper UUID to prevent RLS failures
    if (!userId || !isValidUUID(userId)) {
      if (userId) {
        console.log('[ChesterMemory] Skipping - invalid userId format:', userId);
      }
      return null;
    }

    const { data, error } = await supabase
      .from('chester_long_term_memory')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No memory found - create initial memory
        return await this.createInitialMemory(userId);
      }
      console.error('Error fetching Chester memory:', error);
      return null; // Graceful degradation instead of throwing
    }

    return data as ChesterLongTermMemory;
  }

  /**
   * Create initial memory for new user
   */
  private static async createInitialMemory(userId: string): Promise<ChesterLongTermMemory> {
    const initialMemory = {
      user_id: userId,
      total_games: 0,
      games_won: 0,
      games_lost: 0,
      games_drawn: 0,
      play_style_profile: {},
      recurring_tactical_patterns: {},
      improvement_areas: [],
      recent_games: [],
      memorable_moments: [],
      relationship_metrics: {
        games_together: 0,
        rapport_level: 1,
        inside_jokes: [],
        chester_confidence_in_user: 5,
        preferred_communication_style: 'casual' as const
      },
      win_rate_by_opening: {},
      win_rate_by_color: {},
      average_game_duration: null,
      longest_winning_streak: 0,
      current_streak: 0,
      total_positions_analyzed: 0,
      total_suggestions_given: 0,
      suggestions_followed_percentage: 0,
      last_played_at: null
    };

    const { data, error } = await supabase
      .from('chester_long_term_memory')
      .insert(initialMemory)
      .select()
      .single();

    if (error) {
      console.error('Error creating Chester memory:', error);
      throw error;
    }

    return data as ChesterLongTermMemory;
  }

  /**
   * Update game statistics after a game completes
   */
  static async updateGameStatistics(
    userId: string,
    result: 'win' | 'loss' | 'draw',
    gameDuration?: number
  ): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);

    // Skip if no memory (anonymous user)
    if (!memory) return;

    const updates: Partial<ChesterLongTermMemory> = {
      total_games: memory.total_games + 1,
      last_played_at: new Date().toISOString()
    };

    // Update win/loss/draw counts
    if (result === 'win') {
      updates.games_won = memory.games_won + 1;
      updates.current_streak = memory.current_streak + 1;
      updates.longest_winning_streak = Math.max(
        memory.longest_winning_streak,
        memory.current_streak + 1
      );
    } else if (result === 'loss') {
      updates.games_lost = memory.games_lost + 1;
      updates.current_streak = 0;
    } else {
      updates.games_drawn = memory.games_drawn + 1;
      updates.current_streak = 0;
    }

    // Update average game duration
    if (gameDuration) {
      const totalDuration = (memory.average_game_duration || 0) * memory.total_games + gameDuration;
      updates.average_game_duration = Math.round(totalDuration / (memory.total_games + 1));
    }

    const { error } = await supabase
      .from('chester_long_term_memory')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating game statistics:', error);
      throw error;
    }
  }

  /**
   * Learn from completed game and update play style profile
   */
  static async learnFromGame(userId: string, gameMemory: GameMemory): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    if (!memory) return;
    const profile = memory.play_style_profile || {};

    // Analyze opening preferences
    if (gameMemory.full_move_history.length > 0) {
      const firstMove = gameMemory.full_move_history[0].san;
      profile.opening_preferences = profile.opening_preferences || {};
      profile.opening_preferences[firstMove] =
        (profile.opening_preferences[firstMove] || 0) + 1;
    }

    // Calculate aggressiveness (captures per game)
    const captures = gameMemory.full_move_history.filter(m => m.captured).length;
    const aggressivenessScore = Math.min(captures / 10, 1); // Normalize to 0-1
    profile.aggressiveness = profile.aggressiveness
      ? (profile.aggressiveness + aggressivenessScore) / 2
      : aggressivenessScore;

    // Update tactical patterns
    const patterns = memory.recurring_tactical_patterns || {};
    gameMemory.tactical_themes.forEach(theme => {
      patterns[theme] = (patterns[theme] || 0) + 1;
    });

    // Update common mistakes from bad suggestion outcomes
    const mistakes = profile.common_mistakes || [];
    const badSuggestions = gameMemory.suggestions_given.filter(s => s.outcome === 'bad');
    badSuggestions.forEach(s => {
      if (s.outcome_reason && !mistakes.includes(s.outcome_reason)) {
        mistakes.push(s.outcome_reason);
      }
    });
    profile.common_mistakes = mistakes.slice(-5); // Keep last 5

    const { error } = await supabase
      .from('chester_long_term_memory')
      .update({
        play_style_profile: profile,
        recurring_tactical_patterns: patterns
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error learning from game:', error);
      throw error;
    }
  }

  /**
   * Add recent game summary
   */
  static async addRecentGame(userId: string, gameSummary: RecentGameSummary): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    if (!memory) return;

    // Keep only last 10 games
    const recentGames = [...memory.recent_games, gameSummary].slice(-10);

    const { error } = await supabase
      .from('chester_long_term_memory')
      .update({
        recent_games: recentGames
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error adding recent game:', error);
      throw error;
    }
  }

  /**
   * Add memorable moment
   */
  static async addMemorableMoment(userId: string, moment: MemorableMoment): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    if (!memory) return;

    // Keep only last 20 memorable moments
    const moments = [...memory.memorable_moments, moment].slice(-20);

    const { error } = await supabase
      .from('chester_long_term_memory')
      .update({
        memorable_moments: moments
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error adding memorable moment:', error);
      throw error;
    }
  }

  /**
   * Update relationship metrics (rapport level, confidence, etc.)
   */
  static async updateRelationship(
    userId: string,
    updates: Partial<RelationshipMetrics>
  ): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    if (!memory) return;

    const updatedMetrics = {
      ...memory.relationship_metrics,
      ...updates
    };

    const { error } = await supabase
      .from('chester_long_term_memory')
      .update({
        relationship_metrics: updatedMetrics
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating relationship metrics:', error);
      throw error;
    }
  }

  /**
   * Increment relationship after game
   */
  static async incrementGamesPlayed(userId: string): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    if (!memory) return;

    const metrics = memory.relationship_metrics;
    metrics.games_together += 1;

    // Gradually increase rapport (cap at 10)
    if (metrics.games_together % 3 === 0 && metrics.rapport_level < 10) {
      metrics.rapport_level += 1;
    }

    await this.updateRelationship(userId, metrics);
  }

  /**
   * Update suggestion tracking stats
   */
  static async updateSuggestionStats(
    userId: string,
    suggestionsGiven: number,
    suggestionsFollowed: number
  ): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    if (!memory) return;

    const totalSuggestions = memory.total_suggestions_given + suggestionsGiven;
    const followedPercentage = totalSuggestions > 0
      ? (suggestionsFollowed / totalSuggestions) * 100
      : 0;

    const { error } = await supabase
      .from('chester_long_term_memory')
      .update({
        total_suggestions_given: totalSuggestions,
        suggestions_followed_percentage: followedPercentage
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating suggestion stats:', error);
      throw error;
    }
  }

  /**
   * Update win rate by color
   */
  static async updateWinRateByColor(
    userId: string,
    color: 'white' | 'black',
    won: boolean
  ): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    if (!memory) return;

    const rates = memory.win_rate_by_color || {};
    const currentRate = rates[color] || 0;
    const gamesPlayed = memory.total_games;

    // Exponential moving average
    const newRate = gamesPlayed > 0
      ? (currentRate * (gamesPlayed - 1) + (won ? 1 : 0)) / gamesPlayed
      : (won ? 1 : 0);

    rates[color] = newRate;

    const { error } = await supabase
      .from('chester_long_term_memory')
      .update({
        win_rate_by_color: rates
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating win rate by color:', error);
      throw error;
    }
  }

  /**
   * Get Chester's personality context for AI prompts
   */
  static async getPersonalityContext(userId?: string | null): Promise<{
    rapportLevel: number;
    gamesPlayed: number;
    currentStreak: number;
    recentPerformance: string;
    commonMistakes: string[];
    strongAreas: string[];
  } | null> {
    const memory = await this.getOrCreateMemory(userId);
    if (!memory) return null;

    const recentGames = memory.recent_games.slice(-5);
    const recentWins = recentGames.filter(g => g.result === 'win').length;

    let recentPerformance = 'neutral';
    if (recentWins >= 4) recentPerformance = 'excellent';
    else if (recentWins >= 3) recentPerformance = 'good';
    else if (recentWins <= 1) recentPerformance = 'struggling';

    return {
      rapportLevel: memory.relationship_metrics.rapport_level,
      gamesPlayed: memory.total_games,
      currentStreak: memory.current_streak,
      recentPerformance,
      commonMistakes: memory.play_style_profile.common_mistakes || [],
      strongAreas: memory.play_style_profile.strong_areas || []
    };
  }

  /**
   * Get full context for AI calls (for Chester's awareness)
   */
  static async getFullContext(userId?: string | null): Promise<ChesterLongTermMemory | null> {
    return await this.getOrCreateMemory(userId);
  }

  /**
   * Reset memory (for testing)
   */
  static async resetMemory(userId: string): Promise<void> {
    const { error } = await supabase
      .from('chester_long_term_memory')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error resetting memory:', error);
      throw error;
    }

    // Recreate initial memory
    await this.createInitialMemory(userId);
  }
}
