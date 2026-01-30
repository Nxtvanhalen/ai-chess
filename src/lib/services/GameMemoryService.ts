/**
 * Game Memory Service
 * Manages per-game context and Chester's awareness during gameplay
 */

import { supabase } from '../supabase/client';
import {
  GameMemory,
  GameMoveEntry,
  ChesterCommentary,
  SuggestionEntry,
  PositionEvaluation,
  GamePhaseTransition,
  GameMemorySnapshot
} from '@/types';

export class GameMemoryService {
  /**
   * Initialize game memory for a new game
   */
  static async createGameMemory(gameId: string, userId?: string | null): Promise<GameMemory> {
    const insertData: Record<string, unknown> = {
      game_id: gameId,
      full_move_history: [],
      chester_commentary: [],
      suggestions_given: [],
      tactical_themes: [],
      position_evaluations: {},
      game_phase_transitions: [],
      total_moves: 0
    };

    // Only include user_id if it's a valid UUID
    if (userId) {
      insertData.user_id = userId;
    }

    const { data, error } = await supabase
      .from('game_memory')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating game memory:', error);
      throw error;
    }

    return data as GameMemory;
  }

  /**
   * Get game memory for a specific game
   */
  static async getGameMemory(gameId: string): Promise<GameMemory | null> {
    const { data, error } = await supabase
      .from('game_memory')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No game memory found - this is okay for new games
        return null;
      }
      console.error('Error fetching game memory:', error);
      throw error;
    }

    return data as GameMemory;
  }

  /**
   * Get or create game memory (ensures it exists)
   */
  static async getOrCreateGameMemory(gameId: string, userId?: string | null): Promise<GameMemory> {
    let memory = await this.getGameMemory(gameId);

    if (!memory) {
      memory = await this.createGameMemory(gameId, userId);
    }

    return memory;
  }

  /**
   * Add a move to game history
   */
  static async addMove(
    gameId: string,
    moveEntry: GameMoveEntry
  ): Promise<void> {
    const memory = await this.getOrCreateGameMemory(gameId);

    const updatedHistory = [...memory.full_move_history, moveEntry];

    const { error } = await supabase
      .from('game_memory')
      .update({
        full_move_history: updatedHistory,
        total_moves: updatedHistory.length
      })
      .eq('game_id', gameId);

    if (error) {
      console.error('Error adding move to game memory:', error);
      throw error;
    }

    // Create snapshot for this move
    await this.createSnapshot(memory.id, moveEntry.move_number, 'move_completed', {
      move: moveEntry
    });
  }

  /**
   * Add Chester's commentary
   */
  static async addCommentary(
    gameId: string,
    commentary: ChesterCommentary
  ): Promise<void> {
    const memory = await this.getOrCreateGameMemory(gameId);

    const updatedCommentary = [...memory.chester_commentary, commentary];

    const { error } = await supabase
      .from('game_memory')
      .update({
        chester_commentary: updatedCommentary
      })
      .eq('game_id', gameId);

    if (error) {
      console.error('Error adding commentary to game memory:', error);
      throw error;
    }
  }

  /**
   * Add move suggestions and track them
   */
  static async addSuggestions(
    gameId: string,
    suggestion: SuggestionEntry
  ): Promise<void> {
    const memory = await this.getOrCreateGameMemory(gameId);

    const updatedSuggestions = [...memory.suggestions_given, suggestion];

    const { error } = await supabase
      .from('game_memory')
      .update({
        suggestions_given: updatedSuggestions
      })
      .eq('game_id', gameId);

    if (error) {
      console.error('Error adding suggestions to game memory:', error);
      throw error;
    }

    // Create snapshot for suggestion
    await this.createSnapshot(memory.id, suggestion.move_number, 'suggestion_given', {
      suggestion
    });
  }

  /**
   * Update the outcome of a previous suggestion
   */
  static async updateSuggestionOutcome(
    gameId: string,
    moveNumber: number,
    followed: boolean,
    followedMove?: string,
    outcome?: 'good' | 'neutral' | 'bad',
    outcomeReason?: string
  ): Promise<void> {
    const memory = await this.getGameMemory(gameId);
    if (!memory) return;

    const updatedSuggestions = memory.suggestions_given.map(s =>
      s.move_number === moveNumber
        ? { ...s, followed, followed_move: followedMove, outcome, outcome_reason: outcomeReason }
        : s
    );

    const { error } = await supabase
      .from('game_memory')
      .update({
        suggestions_given: updatedSuggestions
      })
      .eq('game_id', gameId);

    if (error) {
      console.error('Error updating suggestion outcome:', error);
      throw error;
    }
  }

  /**
   * Add tactical theme detected during game
   */
  static async addTacticalTheme(gameId: string, theme: string): Promise<void> {
    const memory = await this.getGameMemory(gameId);
    if (!memory) return;

    // Avoid duplicates
    if (memory.tactical_themes.includes(theme)) return;

    const updatedThemes = [...memory.tactical_themes, theme];

    const { error } = await supabase
      .from('game_memory')
      .update({
        tactical_themes: updatedThemes
      })
      .eq('game_id', gameId);

    if (error) {
      console.error('Error adding tactical theme:', error);
      throw error;
    }

    // Create snapshot for tactical pattern
    await this.createSnapshot(memory.id, memory.total_moves, 'tactical_pattern_detected', {
      theme,
      move_number: memory.total_moves
    });
  }

  /**
   * Add position evaluation
   */
  static async addPositionEvaluation(
    gameId: string,
    moveNumber: number,
    evaluation: PositionEvaluation
  ): Promise<void> {
    const memory = await this.getGameMemory(gameId);
    if (!memory) return;

    const updatedEvaluations = {
      ...memory.position_evaluations,
      [moveNumber]: evaluation
    };

    const { error } = await supabase
      .from('game_memory')
      .update({
        position_evaluations: updatedEvaluations
      })
      .eq('game_id', gameId);

    if (error) {
      console.error('Error adding position evaluation:', error);
      throw error;
    }
  }

  /**
   * Record a game phase transition
   */
  static async addPhaseTransition(
    gameId: string,
    transition: GamePhaseTransition
  ): Promise<void> {
    const memory = await this.getGameMemory(gameId);
    if (!memory) return;

    const updatedTransitions = [...memory.game_phase_transitions, transition];

    const { error } = await supabase
      .from('game_memory')
      .update({
        game_phase_transitions: updatedTransitions
      })
      .eq('game_id', gameId);

    if (error) {
      console.error('Error adding phase transition:', error);
      throw error;
    }

    // Create snapshot for phase transition
    await this.createSnapshot(memory.id, transition.move_number, 'phase_transition', {
      transition
    });
  }

  /**
   * Update game narrative
   */
  static async updateGameNarrative(gameId: string, narrative: string): Promise<void> {
    const { error } = await supabase
      .from('game_memory')
      .update({
        game_narrative: narrative
      })
      .eq('game_id', gameId);

    if (error) {
      console.error('Error updating game narrative:', error);
      throw error;
    }
  }

  /**
   * Finalize game memory when game ends
   */
  static async finalizeGame(
    gameId: string,
    result: string,
    durationSeconds: number
  ): Promise<void> {
    const { error } = await supabase
      .from('game_memory')
      .update({
        final_result: result,
        game_duration_seconds: durationSeconds
      })
      .eq('game_id', gameId);

    if (error) {
      console.error('Error finalizing game memory:', error);
      throw error;
    }
  }

  /**
   * Get full game context for AI calls
   */
  static async getGameContext(gameId: string): Promise<{
    fullMoveHistory: GameMoveEntry[];
    chesterCommentary: ChesterCommentary[];
    suggestionsGiven: SuggestionEntry[];
    tacticalThemes: string[];
    gameNarrative: string | null;
    totalMoves: number;
  } | null> {
    const memory = await this.getGameMemory(gameId);

    if (!memory) return null;

    return {
      fullMoveHistory: memory.full_move_history,
      chesterCommentary: memory.chester_commentary,
      suggestionsGiven: memory.suggestions_given,
      tacticalThemes: memory.tactical_themes,
      gameNarrative: memory.game_narrative,
      totalMoves: memory.total_moves
    };
  }

  /**
   * Get recent commentary (last N moves)
   */
  static async getRecentCommentary(gameId: string, lastNMoves: number = 5): Promise<ChesterCommentary[]> {
    const memory = await this.getGameMemory(gameId);

    if (!memory) return [];

    return memory.chester_commentary.slice(-lastNMoves);
  }

  /**
   * Get recent moves (last N moves)
   */
  static async getRecentMoves(gameId: string, lastNMoves: number = 10): Promise<GameMoveEntry[]> {
    const memory = await this.getGameMemory(gameId);

    if (!memory) return [];

    return memory.full_move_history.slice(-lastNMoves);
  }

  /**
   * Create a snapshot for incremental tracking
   */
  private static async createSnapshot(
    gameMemoryId: string,
    moveNumber: number,
    type: GameMemorySnapshot['snapshot_type'],
    data: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from('game_memory_snapshots')
      .insert({
        game_memory_id: gameMemoryId,
        move_number: moveNumber,
        snapshot_type: type,
        snapshot_data: data
      });

    if (error && error.code !== '23505') { // Ignore unique constraint violations
      console.error('Error creating snapshot:', error);
    }
  }

  /**
   * Get snapshots for a game (for debugging/analysis)
   */
  static async getSnapshots(
    gameMemoryId: string,
    type?: GameMemorySnapshot['snapshot_type']
  ): Promise<GameMemorySnapshot[]> {
    let query = supabase
      .from('game_memory_snapshots')
      .select('*')
      .eq('game_memory_id', gameMemoryId)
      .order('move_number', { ascending: true });

    if (type) {
      query = query.eq('snapshot_type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching snapshots:', error);
      throw error;
    }

    return data as GameMemorySnapshot[];
  }

  /**
   * Delete game memory (cleanup)
   */
  static async deleteGameMemory(gameId: string): Promise<void> {
    const { error } = await supabase
      .from('game_memory')
      .delete()
      .eq('game_id', gameId);

    if (error) {
      console.error('Error deleting game memory:', error);
      throw error;
    }
  }

  /**
   * Get recent games for a user (for past game analysis)
   */
  static async getRecentGames(userId?: string | null, limit: number = 5): Promise<GameMemory[]> {
    const { data, error } = await supabase
      .from('game_memory')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent games:', error);
      throw error;
    }

    return (data || []) as GameMemory[];
  }

  /**
   * Get the last game (not the current one) - doesn't require finalization
   */
  static async getLastCompletedGame(userId?: string | null, currentGameId?: string): Promise<GameMemory | null> {
    let query = supabase
      .from('game_memory')
      .select('*')
      .eq('user_id', userId)
      .gt('total_moves', 0) // Has at least some moves
      .order('created_at', { ascending: false })
      .limit(2); // Get 2 in case first is current game

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching last game:', error);
      throw error;
    }

    if (!data || data.length === 0) return null;

    // Return the first game that isn't the current one
    for (const game of data) {
      if (game.game_id !== currentGameId) {
        return game as GameMemory;
      }
    }

    return null;
  }

  /**
   * Get game summary for past game review
   */
  static async getGameSummary(gameId: string): Promise<{
    result: string | null;
    totalMoves: number;
    duration: number | null;
    tacticalThemes: string[];
    narrative: string | null;
    keyMoments: ChesterCommentary[];
  } | null> {
    const memory = await this.getGameMemory(gameId);
    if (!memory) return null;

    // Get key moments (tactical commentary based on urgency level, not routine moves)
    const keyMoments = memory.chester_commentary.filter(c =>
      c.type === 'post_move' &&
      (c.metadata?.urgency_level === 'emergency' || c.metadata?.urgency_level === 'tactical')
    );

    return {
      result: memory.final_result,
      totalMoves: memory.total_moves,
      duration: memory.game_duration_seconds,
      tacticalThemes: memory.tactical_themes,
      narrative: memory.game_narrative,
      keyMoments
    };
  }
}
