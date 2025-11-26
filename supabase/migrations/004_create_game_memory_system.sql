-- Phase 1: Unified Game Memory System
-- Creates tables for Chester's comprehensive game awareness and learning

-- Game Memory: Per-game context and analysis
CREATE TABLE game_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT DEFAULT 'chris', -- For future multi-user support
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Game context (updated throughout game)
  full_move_history JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ move_number, san, from, to, piece, captured, fen_after, timestamp }]

  chester_commentary JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ move_number, type: 'pre_move'|'post_move'|'chat', content, timestamp }]

  suggestions_given JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ move_number, suggestions: [], followed: boolean, outcome: 'good'|'neutral'|'bad' }]

  -- Tactical analysis throughout game
  tactical_themes TEXT[] DEFAULT '{}',
  -- Fork, pin, skewer, discovered_attack, back_rank, etc.

  position_evaluations JSONB DEFAULT '{}'::jsonb,
  -- Structure: { move_number: { evaluation, threats, opportunities, urgency_level } }

  -- Game narrative
  game_narrative TEXT,
  -- "Aggressive King's Gambit opening, transitioned to endgame with material advantage"

  game_phase_transitions JSONB DEFAULT '[]'::jsonb,
  -- [{ move_number, from_phase, to_phase, key_moment: "Queen trade initiated endgame" }]

  -- Metadata
  total_moves INTEGER DEFAULT 0,
  game_duration_seconds INTEGER,
  final_result TEXT,

  CONSTRAINT unique_game_memory UNIQUE(game_id)
);

-- Chester Long-Term Memory: Cross-game learning and personality
CREATE TABLE chester_long_term_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL DEFAULT 'chris',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Aggregate statistics
  total_games INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  games_drawn INTEGER DEFAULT 0,

  -- Playing style analysis (learned over time)
  play_style_profile JSONB DEFAULT '{}'::jsonb,
  /* Structure: {
    opening_preferences: { e4: 0.6, d4: 0.3, ... },
    aggressiveness: 0.7, // 0-1 scale
    tactical_vs_positional: 0.6, // 0=positional, 1=tactical
    risk_tolerance: 0.5,
    piece_preferences: { knight: 0.7, bishop: 0.6 },
    castling_preference: { kingside: 0.8, queenside: 0.2 },
    average_game_length: 45,
    favorite_openings: ["King's Gambit", "Italian Game"],
    common_mistakes: ["hanging_pieces", "weak_back_rank"],
    strong_areas: ["endgame_technique", "tactical_vision"]
  } */

  -- Common patterns and themes
  recurring_tactical_patterns JSONB DEFAULT '{}'::jsonb,
  -- { fork: 15, pin: 8, skewer: 3, discovered_attack: 5 }

  improvement_areas TEXT[] DEFAULT '{}',
  -- ["Back rank defense", "Knight endgames", "Time management"]

  -- Recent game summaries (last 10 games)
  recent_games JSONB DEFAULT '[]'::jsonb,
  /* Structure: [{
    game_id, date, result, opening, key_moments: [],
    chester_notes: "Chris played very aggressively, paid off"
  }] */

  -- Memorable moments (epic wins, brutal losses, brilliant moves)
  memorable_moments JSONB DEFAULT '[]'::jsonb,
  /* Structure: [{
    game_id, move_number, type: 'brilliant_move'|'blunder'|'comeback',
    description, impact
  }] */

  -- Chester's personality evolution
  relationship_metrics JSONB DEFAULT '{}'::jsonb,
  /* Structure: {
    games_together: 0,
    rapport_level: 1, // 1-10, affects sassiness
    inside_jokes: [],
    chester_confidence_in_user: 5, // 1-10
    preferred_communication_style: "casual" // casual, detailed, minimal
  } */

  -- Performance tracking
  win_rate_by_opening JSONB DEFAULT '{}'::jsonb,
  win_rate_by_color JSONB DEFAULT '{}'::jsonb,
  -- { white: 0.55, black: 0.45 }

  average_game_duration INTEGER,
  longest_winning_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,

  -- Learning metadata
  total_positions_analyzed INTEGER DEFAULT 0,
  total_suggestions_given INTEGER DEFAULT 0,
  suggestions_followed_percentage FLOAT DEFAULT 0.0,

  last_played_at TIMESTAMP WITH TIME ZONE
);

-- Game Memory Updates: Track incremental updates during game
CREATE TABLE game_memory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_memory_id UUID REFERENCES game_memory(id) ON DELETE CASCADE NOT NULL,
  move_number INTEGER NOT NULL,
  snapshot_type VARCHAR(50) NOT NULL,
  -- Types: 'move_completed', 'suggestion_given', 'tactical_pattern_detected', 'phase_transition'

  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- For efficient querying
  CONSTRAINT unique_snapshot UNIQUE(game_memory_id, move_number, snapshot_type)
);

-- Indexes for performance
CREATE INDEX idx_game_memory_game_id ON game_memory(game_id);
CREATE INDEX idx_game_memory_user_id ON game_memory(user_id);
CREATE INDEX idx_game_memory_created_at ON game_memory(created_at DESC);

CREATE INDEX idx_chester_memory_user_id ON chester_long_term_memory(user_id);
CREATE INDEX idx_chester_memory_updated_at ON chester_long_term_memory(updated_at DESC);

CREATE INDEX idx_game_memory_snapshots_game_memory_id ON game_memory_snapshots(game_memory_id);
CREATE INDEX idx_game_memory_snapshots_move_number ON game_memory_snapshots(move_number);
CREATE INDEX idx_game_memory_snapshots_type ON game_memory_snapshots(snapshot_type);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_memory_updated_at
  BEFORE UPDATE ON game_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chester_memory_updated_at
  BEFORE UPDATE ON chester_long_term_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Initialize Chester's memory for Chris (default user)
INSERT INTO chester_long_term_memory (user_id, relationship_metrics)
VALUES (
  'chris',
  jsonb_build_object(
    'games_together', 0,
    'rapport_level', 1,
    'inside_jokes', '[]'::jsonb,
    'chester_confidence_in_user', 5,
    'preferred_communication_style', 'casual'
  )
)
ON CONFLICT (user_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE game_memory IS 'Per-game context and analysis for Chester AI awareness';
COMMENT ON TABLE chester_long_term_memory IS 'Cross-game learning and personality evolution';
COMMENT ON TABLE game_memory_snapshots IS 'Incremental game state updates for efficiency';

COMMENT ON COLUMN game_memory.full_move_history IS 'Complete move sequence with metadata';
COMMENT ON COLUMN game_memory.chester_commentary IS 'All Chester comments tied to moves';
COMMENT ON COLUMN game_memory.suggestions_given IS 'Track suggestion quality and outcomes';
COMMENT ON COLUMN game_memory.tactical_themes IS 'Tactical patterns detected during game';
COMMENT ON COLUMN game_memory.game_narrative IS 'High-level game story for context';

COMMENT ON COLUMN chester_long_term_memory.play_style_profile IS 'Learned player tendencies and preferences';
COMMENT ON COLUMN chester_long_term_memory.relationship_metrics IS 'Chester personality and rapport tracking';
COMMENT ON COLUMN chester_long_term_memory.memorable_moments IS 'Significant game moments worth remembering';
