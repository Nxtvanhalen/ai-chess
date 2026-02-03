import type { Move as ChessMove } from 'chess.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'engine';
  type?: 'move' | 'suggestion' | 'analysis' | 'commentary' | 'conversation';
  content: string;
  timestamp: Date;
  metadata?: {
    moveContext?: string;
    gameState?: string;
    position?: string;
    isThinking?: boolean;
    suggestions?: MoveSuggestion[];
    engineAnalysis?: EngineAnalysis;
    evaluation?: number;
    analysis?: string;
  };
}

export interface MoveSuggestion {
  move: string;
  reasoning: string;
  casual?: boolean;
}

export interface EngineAnalysis {
  move: string;
  evaluation: number;
  depth: number;
}

export interface Game {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed' | 'abandoned';
  pgn: string;
  fen: string;
  metadata?: {
    playerColor?: 'white' | 'black';
    timeControl?: string;
    result?: string;
  };
}

export interface GameMove extends ChessMove {
  id: string;
  gameId: string;
  moveNumber: number;
  fenAfter: string;
  createdAt: Date;
  analysis?: {
    evaluation?: number;
    bestMove?: string;
    accuracy?: number;
  };
}

export interface Conversation {
  id: string;
  gameId: string;
  createdAt: Date;
  messages: ChatMessage[];
  summary?: string;
}

export interface Memory {
  id: string;
  createdAt: Date;
  category: 'game_pattern' | 'conversation' | 'preference' | 'coaching';
  content: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Phase 1: Game Memory System Types
// ============================================================================

/**
 * Move entry in game history with full context
 */
export interface GameMoveEntry {
  move_number: number;
  san: string;
  from: string;
  to: string;
  piece: string;
  captured?: string;
  fen_after: string;
  timestamp: string;
  player_type: 'human' | 'ai';
  evaluation?: number;
}

/**
 * Chester's commentary on a move or position
 */
export interface ChesterCommentary {
  move_number: number;
  type: 'pre_move' | 'post_move' | 'chat' | 'suggestion';
  content: string;
  timestamp: string;
  metadata?: {
    urgency_level?: 'emergency' | 'tactical' | 'strategic';
    tactical_themes?: string[];
  };
}

/**
 * Move suggestion with outcome tracking
 */
export interface SuggestionEntry {
  move_number: number;
  suggestions: MoveSuggestion[];
  followed: boolean;
  followed_move?: string;
  outcome?: 'good' | 'neutral' | 'bad';
  outcome_reason?: string;
  timestamp: string;
}

/**
 * Position evaluation at a specific move
 */
export interface PositionEvaluation {
  evaluation: number;
  threats: string[];
  opportunities: string[];
  urgency_level: 'emergency' | 'tactical' | 'strategic';
  tactical_patterns?: string[];
  material_balance?: number;
}

/**
 * Game phase transition marker
 */
export interface GamePhaseTransition {
  move_number: number;
  from_phase: 'opening' | 'middlegame' | 'endgame';
  to_phase: 'opening' | 'middlegame' | 'endgame';
  key_moment: string;
  timestamp: string;
}

/**
 * Per-game memory - Chester's awareness of current game
 */
export interface GameMemory {
  id: string;
  game_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;

  // Game context
  full_move_history: GameMoveEntry[];
  chester_commentary: ChesterCommentary[];
  suggestions_given: SuggestionEntry[];

  // Tactical analysis
  tactical_themes: string[];
  position_evaluations: Record<number, PositionEvaluation>;

  // Game narrative
  game_narrative: string | null;
  game_phase_transitions: GamePhaseTransition[];

  // Metadata
  total_moves: number;
  game_duration_seconds: number | null;
  final_result: string | null;
}

/**
 * Playing style profile - learned tendencies
 */
export interface PlayStyleProfile {
  opening_preferences?: Record<string, number>; // e.g., { "e4": 0.6, "d4": 0.3 }
  aggressiveness?: number; // 0-1 scale
  tactical_vs_positional?: number; // 0=positional, 1=tactical
  risk_tolerance?: number; // 0-1 scale
  piece_preferences?: Record<string, number>; // e.g., { "knight": 0.7, "bishop": 0.6 }
  castling_preference?: { kingside: number; queenside: number };
  average_game_length?: number;
  favorite_openings?: string[];
  common_mistakes?: string[];
  strong_areas?: string[];
}

/**
 * Recent game summary
 */
export interface RecentGameSummary {
  game_id: string;
  date: string;
  result: 'win' | 'loss' | 'draw';
  opening: string;
  key_moments: string[];
  chester_notes: string;
  moves_played: number;
  duration_seconds?: number;
}

/**
 * Memorable game moment
 */
export interface MemorableMoment {
  game_id: string;
  move_number: number;
  type: 'brilliant_move' | 'blunder' | 'comeback' | 'tactical_sequence' | 'endgame_precision';
  description: string;
  impact: string;
  timestamp: string;
}

/**
 * Chester's relationship metrics
 */
export interface RelationshipMetrics {
  games_together: number;
  rapport_level: number; // 1-10, affects personality
  inside_jokes: string[];
  chester_confidence_in_user: number; // 1-10
  preferred_communication_style: 'casual' | 'detailed' | 'minimal';
}

/**
 * Long-term memory - Chester's cross-game learning
 */
export interface ChesterLongTermMemory {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;

  // Statistics
  total_games: number;
  games_won: number;
  games_lost: number;
  games_drawn: number;

  // Learning
  play_style_profile: PlayStyleProfile;
  recurring_tactical_patterns: Record<string, number>;
  improvement_areas: string[];
  recent_games: RecentGameSummary[];
  memorable_moments: MemorableMoment[];

  // Personality
  relationship_metrics: RelationshipMetrics;

  // Performance
  win_rate_by_opening: Record<string, number>;
  win_rate_by_color: { white?: number; black?: number };
  average_game_duration: number | null;
  longest_winning_streak: number;
  current_streak: number;

  // Learning metadata
  total_positions_analyzed: number;
  total_suggestions_given: number;
  suggestions_followed_percentage: number;

  last_played_at: string | null;
}

/**
 * Game memory snapshot for incremental updates
 */
export interface GameMemorySnapshot {
  id: string;
  game_memory_id: string;
  move_number: number;
  snapshot_type:
    | 'move_completed'
    | 'suggestion_given'
    | 'tactical_pattern_detected'
    | 'phase_transition';
  snapshot_data: Record<string, any>;
  created_at: string;
}
