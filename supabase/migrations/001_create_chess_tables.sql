-- AI Chess Database Schema
-- Create all tables for Chess Butler functionality

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  pgn TEXT,
  fen TEXT,
  player_color VARCHAR(5) DEFAULT 'white' CHECK (player_color IN ('white', 'black')),
  result VARCHAR(10),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Moves table
CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  move_notation VARCHAR(10) NOT NULL,
  fen_before TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  player_type VARCHAR(10) NOT NULL CHECK (player_type IN ('human', 'ai')),
  analysis JSONB DEFAULT '{}'::jsonb
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  summary TEXT
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Memory table (for Chess Butler's long-term memory)
CREATE TABLE memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category VARCHAR(50) NOT NULL CHECK (category IN ('game_pattern', 'conversation', 'preference', 'coaching', 'player_style')),
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  relevance_score FLOAT DEFAULT 0.0,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);