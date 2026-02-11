// =============================================================================
// SUPABASE DATABASE TYPES - Chester AI Chess
// =============================================================================
// Type definitions for all database tables
// =============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'premium';
export type SubscriptionStatus =
  | 'active'
  | 'inactive'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'unpaid';
export type GameStatus = 'active' | 'completed' | 'abandoned';
export type PlayerColor = 'white' | 'black';
export type PlayerType = 'human' | 'ai';
export type MessageRole = 'user' | 'assistant' | 'system';
export type Difficulty = 'easy' | 'medium' | 'hard';

// -----------------------------------------------------------------------------
// USER PROFILES
// -----------------------------------------------------------------------------

export interface UserProfile {
  id: string; // UUID linked to auth.users
  created_at: string;
  updated_at: string;
  display_name: string | null;
  avatar_url: string | null;
  preferred_color: 'white' | 'black' | 'random';
  preferred_difficulty: Difficulty;
  board_theme: string;
  piece_theme: string;
  subscription_tier: SubscriptionTier;
  games_played: number;
  games_won: number;
  total_moves: number;
  email_notifications: boolean;
  marketing_emails: boolean;
  rating: number;
}

export interface UserProfileInsert {
  id: string;
  display_name?: string;
  avatar_url?: string;
  preferred_color?: 'white' | 'black' | 'random';
  preferred_difficulty?: Difficulty;
}

export interface UserProfileUpdate {
  display_name?: string;
  avatar_url?: string;
  preferred_color?: 'white' | 'black' | 'random';
  preferred_difficulty?: Difficulty;
  board_theme?: string;
  piece_theme?: string;
  email_notifications?: boolean;
  marketing_emails?: boolean;
}

// -----------------------------------------------------------------------------
// SUBSCRIPTIONS
// -----------------------------------------------------------------------------

export interface Subscription {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: SubscriptionStatus;
  plan_type: SubscriptionTier;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  ai_moves_balance: number;
  chat_messages_balance: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
}

export interface SubscriptionUsage {
  ai_moves: {
    balance: number;
    unlimited: boolean;
  };
  chat_messages: {
    balance: number;
    unlimited: boolean;
  };
}

// Plan allocation per billing cycle (monthly top-up amounts)
export const PLAN_ALLOCATIONS: Record<
  SubscriptionTier,
  {
    monthly_ai_moves: number;
    monthly_chat_messages: number;
    features: string[];
  }
> = {
  free: {
    monthly_ai_moves: 50, // non-stacking: resets to 50
    monthly_chat_messages: 20,
    features: ['Play against Chester AI', 'Basic move suggestions', 'Game history (last 10 games)'],
  },
  pro: {
    monthly_ai_moves: 500, // stacking: adds 500 to balance
    monthly_chat_messages: 200,
    features: [
      'Everything in Free',
      'Unlimited game history',
      'Advanced position analysis',
      'Chester personality customization',
      'Export games to PGN',
    ],
  },
  premium: {
    monthly_ai_moves: -1, // unlimited
    monthly_chat_messages: -1, // unlimited
    features: [
      'Everything in Pro',
      'Unlimited AI moves',
      'Unlimited chat',
      'Priority AI response',
      'Custom difficulty tuning',
      'Early access to new features',
    ],
  },
};

// -----------------------------------------------------------------------------
// GAMES
// -----------------------------------------------------------------------------

export interface Game {
  id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  status: GameStatus;
  pgn: string | null;
  fen: string | null;
  player_color: PlayerColor;
  result: string | null;
  metadata: Record<string, unknown>;
}

export interface GameInsert {
  user_id?: string;
  status?: GameStatus;
  pgn?: string;
  fen?: string;
  player_color?: PlayerColor;
  metadata?: Record<string, unknown>;
}

export interface GameUpdate {
  status?: GameStatus;
  pgn?: string;
  fen?: string;
  result?: string;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// MOVES
// -----------------------------------------------------------------------------

export interface Move {
  id: string;
  game_id: string;
  move_number: number;
  move_notation: string;
  fen_before: string;
  fen_after: string;
  created_at: string;
  player_type: PlayerType;
  analysis: Record<string, unknown>;
}

export interface MoveInsert {
  game_id: string;
  move_number: number;
  move_notation: string;
  fen_before: string;
  fen_after: string;
  player_type: PlayerType;
  analysis?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// CONVERSATIONS
// -----------------------------------------------------------------------------

export interface Conversation {
  id: string;
  user_id: string | null;
  game_id: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  summary: string | null;
}

export interface ConversationInsert {
  user_id?: string;
  game_id?: string;
  summary?: string;
}

// -----------------------------------------------------------------------------
// MESSAGES
// -----------------------------------------------------------------------------

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface MessageInsert {
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// GAME MEMORY (Chester's per-game context)
// -----------------------------------------------------------------------------

export interface GameMemory {
  id: string;
  game_id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  full_move_history: Array<{
    move_number: number;
    san: string;
    from: string;
    to: string;
    piece: string;
    captured?: string;
    fen_after: string;
    timestamp: string;
  }>;
  chester_commentary: Array<{
    move_number: number;
    type: 'pre_move' | 'post_move' | 'chat';
    content: string;
    timestamp: string;
  }>;
  suggestions_given: Array<{
    move_number: number;
    suggestions: string[];
    followed: boolean;
    outcome: 'good' | 'neutral' | 'bad';
  }>;
  tactical_themes: string[];
  position_evaluations: Record<
    number,
    {
      evaluation: number;
      threats: string[];
      opportunities: string[];
      urgency_level: number;
    }
  >;
  game_narrative: string | null;
  game_phase_transitions: Array<{
    move_number: number;
    from_phase: string;
    to_phase: string;
    key_moment: string;
  }>;
  total_moves: number;
  game_duration_seconds: number | null;
  final_result: string | null;
}

// -----------------------------------------------------------------------------
// CHESTER LONG-TERM MEMORY (cross-game learning)
// -----------------------------------------------------------------------------

export interface ChesterLongTermMemory {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  total_games: number;
  games_won: number;
  games_lost: number;
  games_drawn: number;
  play_style_profile: {
    opening_preferences?: Record<string, number>;
    aggressiveness?: number;
    tactical_vs_positional?: number;
    risk_tolerance?: number;
    piece_preferences?: Record<string, number>;
    castling_preference?: Record<string, number>;
    average_game_length?: number;
    favorite_openings?: string[];
    common_mistakes?: string[];
    strong_areas?: string[];
  };
  recurring_tactical_patterns: Record<string, number>;
  improvement_areas: string[];
  recent_games: Array<{
    game_id: string;
    date: string;
    result: string;
    opening: string;
    key_moments: string[];
    chester_notes: string;
  }>;
  memorable_moments: Array<{
    game_id: string;
    move_number: number;
    type: 'brilliant_move' | 'blunder' | 'comeback';
    description: string;
    impact: string;
  }>;
  relationship_metrics: {
    games_together: number;
    rapport_level: number;
    inside_jokes: string[];
    chester_confidence_in_user: number;
    preferred_communication_style: 'casual' | 'detailed' | 'minimal';
  };
  win_rate_by_opening: Record<string, number>;
  win_rate_by_color: Record<string, number>;
  average_game_duration: number | null;
  longest_winning_streak: number;
  current_streak: number;
  total_positions_analyzed: number;
  total_suggestions_given: number;
  suggestions_followed_percentage: number;
  last_played_at: string | null;
}

// -----------------------------------------------------------------------------
// DATABASE SCHEMA (for Supabase client typing)
// -----------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
      };
      subscriptions: {
        Row: Subscription;
        Insert: never; // Created via trigger
        Update: Partial<Subscription>;
      };
      games: {
        Row: Game;
        Insert: GameInsert;
        Update: GameUpdate;
      };
      moves: {
        Row: Move;
        Insert: MoveInsert;
        Update: never;
      };
      conversations: {
        Row: Conversation;
        Insert: ConversationInsert;
        Update: Partial<Conversation>;
      };
      messages: {
        Row: Message;
        Insert: MessageInsert;
        Update: never;
      };
      game_memory: {
        Row: GameMemory;
        Insert: Partial<GameMemory> & { game_id: string };
        Update: Partial<GameMemory>;
      };
      chester_long_term_memory: {
        Row: ChesterLongTermMemory;
        Insert: Partial<ChesterLongTermMemory> & { user_id: string };
        Update: Partial<ChesterLongTermMemory>;
      };
    };
    Functions: {
      can_use_ai_move: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      can_use_chat: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      increment_ai_move_usage: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      increment_chat_usage: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      add_to_balance: {
        Args: { p_user_id: string; p_ai_moves?: number; p_chat_messages?: number };
        Returns: undefined;
      };
      set_balance: {
        Args: { p_user_id: string; p_ai_moves?: number; p_chat_messages?: number };
        Returns: undefined;
      };
    };
  };
}
