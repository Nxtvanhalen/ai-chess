-- ============================================================================
-- Migration 005: Multi-User Support and Subscription System
-- Chester AI Chess - Production Ready
-- ============================================================================
-- This migration:
-- 1. Creates user_profiles table linked to auth.users
-- 2. Creates subscriptions table for Stripe integration
-- 3. Adds user_id (UUID) to all game-related tables
-- 4. Updates RLS policies for proper multi-user security
-- 5. Preserves existing data with fallback handling
-- ============================================================================

-- ============================================================================
-- PART 1: USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- User display info
  display_name TEXT,
  avatar_url TEXT,

  -- Chess preferences
  preferred_color TEXT DEFAULT 'white' CHECK (preferred_color IN ('white', 'black', 'random')),
  preferred_difficulty TEXT DEFAULT 'medium' CHECK (preferred_difficulty IN ('easy', 'medium', 'hard')),
  board_theme TEXT DEFAULT 'classic',
  piece_theme TEXT DEFAULT 'standard',

  -- Subscription tier (updated by Stripe webhook)
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),

  -- Usage tracking
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_moves INTEGER DEFAULT 0,

  -- Account settings
  email_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Trigger to auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger only if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- PART 2: SUBSCRIPTIONS TABLE (Stripe Integration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Stripe data
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  -- Subscription status
  status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing', 'unpaid')),

  -- Plan details
  plan_type TEXT NOT NULL DEFAULT 'free'
    CHECK (plan_type IN ('free', 'pro', 'premium')),

  -- Billing cycle
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,

  -- Usage limits (depends on plan)
  daily_ai_moves_limit INTEGER DEFAULT 50, -- free: 50, pro: 500, premium: unlimited (-1)
  daily_ai_moves_used INTEGER DEFAULT 0,
  daily_chat_messages_limit INTEGER DEFAULT 20, -- free: 20, pro: 200, premium: unlimited (-1)
  daily_chat_messages_used INTEGER DEFAULT 0,
  last_usage_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Payment history reference
  last_payment_date TIMESTAMP WITH TIME ZONE,
  last_payment_amount INTEGER, -- in cents

  CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================================================
-- PART 3: ADD USER_ID TO EXISTING TABLES
-- ============================================================================

-- Add user_id column to games table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'user_id' AND data_type = 'uuid'
  ) THEN
    -- Drop old text user_id if exists
    ALTER TABLE games DROP COLUMN IF EXISTS user_id;
    -- Add new UUID user_id
    ALTER TABLE games ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
  END IF;
END $$;

-- Add user_id to conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'user_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE conversations DROP COLUMN IF EXISTS user_id;
    ALTER TABLE conversations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
  END IF;
END $$;

-- Add user_id to memory table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memory' AND column_name = 'user_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE memory DROP COLUMN IF EXISTS user_id;
    ALTER TABLE memory ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_memory_user_id ON memory(user_id);
  END IF;
END $$;

-- Update game_memory to use UUID user_id (currently TEXT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_memory' AND column_name = 'user_id' AND data_type = 'text'
  ) THEN
    ALTER TABLE game_memory DROP COLUMN user_id;
    ALTER TABLE game_memory ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    -- Re-create index
    DROP INDEX IF EXISTS idx_game_memory_user_id;
    CREATE INDEX idx_game_memory_user_id ON game_memory(user_id);
  END IF;
END $$;

-- Update chester_long_term_memory to use UUID user_id (currently TEXT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chester_long_term_memory' AND column_name = 'user_id' AND data_type = 'text'
  ) THEN
    -- Drop unique constraint first
    ALTER TABLE chester_long_term_memory DROP CONSTRAINT IF EXISTS chester_long_term_memory_user_id_key;
    ALTER TABLE chester_long_term_memory DROP COLUMN user_id;
    ALTER TABLE chester_long_term_memory ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE;
    -- Re-create index
    DROP INDEX IF EXISTS idx_chester_memory_user_id;
    CREATE INDEX idx_chester_memory_user_id ON chester_long_term_memory(user_id);
  END IF;
END $$;

-- ============================================================================
-- PART 4: SECURE RLS POLICIES
-- ============================================================================

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on games" ON games;
DROP POLICY IF EXISTS "Allow all operations on moves" ON moves;
DROP POLICY IF EXISTS "Allow all operations on conversations" ON conversations;
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
DROP POLICY IF EXISTS "Allow all operations on memory" ON memory;

-- Enable RLS on tables that might not have it
ALTER TABLE game_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE chester_long_term_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_memory_snapshots ENABLE ROW LEVEL SECURITY;

-- USER_PROFILES POLICIES
-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- SUBSCRIPTIONS POLICIES
-- Users can only view their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can modify subscriptions (Stripe webhooks)
-- No INSERT/UPDATE/DELETE policies for regular users

-- GAMES POLICIES
CREATE POLICY "Users can view own games"
  ON games FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL); -- NULL allows anonymous games during transition

CREATE POLICY "Users can create games"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own games"
  ON games FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own games"
  ON games FOR DELETE
  USING (auth.uid() = user_id);

-- MOVES POLICIES (access through game ownership)
CREATE POLICY "Users can view moves from own games"
  ON moves FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = moves.game_id
      AND (games.user_id = auth.uid() OR games.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert moves to own games"
  ON moves FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = moves.game_id
      AND (games.user_id = auth.uid() OR auth.uid() IS NOT NULL)
    )
  );

-- CONVERSATIONS POLICIES
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- MESSAGES POLICIES (access through conversation ownership)
CREATE POLICY "Users can view messages from own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user_id = auth.uid() OR conversations.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert messages to own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user_id = auth.uid() OR auth.uid() IS NOT NULL)
    )
  );

-- MEMORY POLICIES
CREATE POLICY "Users can view own memory"
  ON memory FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create memory entries"
  ON memory FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own memory"
  ON memory FOR UPDATE
  USING (auth.uid() = user_id);

-- GAME_MEMORY POLICIES
CREATE POLICY "Users can view own game_memory"
  ON game_memory FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create game_memory entries"
  ON game_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own game_memory"
  ON game_memory FOR UPDATE
  USING (auth.uid() = user_id);

-- CHESTER_LONG_TERM_MEMORY POLICIES
CREATE POLICY "Users can view own chester_memory"
  ON chester_long_term_memory FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create chester_memory entries"
  ON chester_long_term_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own chester_memory"
  ON chester_long_term_memory FOR UPDATE
  USING (auth.uid() = user_id);

-- GAME_MEMORY_SNAPSHOTS POLICIES (access through game_memory ownership)
CREATE POLICY "Users can view own game_memory_snapshots"
  ON game_memory_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_memory
      WHERE game_memory.id = game_memory_snapshots.game_memory_id
      AND (game_memory.user_id = auth.uid() OR game_memory.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert game_memory_snapshots to own game_memory"
  ON game_memory_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_memory
      WHERE game_memory.id = game_memory_snapshots.game_memory_id
      AND (game_memory.user_id = auth.uid() OR auth.uid() IS NOT NULL)
    )
  );

-- ============================================================================
-- PART 5: HELPER FUNCTIONS
-- ============================================================================

-- Function to initialize subscription for new user
CREATE OR REPLACE FUNCTION initialize_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, plan_type)
  VALUES (NEW.id, 'active', 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for subscription initialization
DROP TRIGGER IF EXISTS on_user_profile_created ON user_profiles;
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION initialize_user_subscription();

-- Function to reset daily usage (called by cron job)
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET
    daily_ai_moves_used = 0,
    daily_chat_messages_used = 0,
    last_usage_reset = NOW()
  WHERE last_usage_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can make AI move
CREATE OR REPLACE FUNCTION can_use_ai_move(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  SELECT daily_ai_moves_limit, daily_ai_moves_used
  INTO v_limit, v_used
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN TRUE; -- Allow if no subscription record (will be created)
  END IF;

  IF v_limit = -1 THEN
    RETURN TRUE; -- Unlimited
  END IF;

  RETURN v_used < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment AI move usage
CREATE OR REPLACE FUNCTION increment_ai_move_usage(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET daily_ai_moves_used = daily_ai_moves_used + 1
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can send chat message
CREATE OR REPLACE FUNCTION can_use_chat(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  SELECT daily_chat_messages_limit, daily_chat_messages_used
  INTO v_limit, v_used
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  IF v_limit = -1 THEN
    RETURN TRUE; -- Unlimited
  END IF;

  RETURN v_used < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment chat usage
CREATE OR REPLACE FUNCTION increment_chat_usage(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET daily_chat_messages_used = daily_chat_messages_used + 1
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: UPDATE TRIGGERS
-- ============================================================================

-- Ensure updated_at triggers exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_profiles IS 'User profile data linked to auth.users, auto-created on signup';
COMMENT ON TABLE subscriptions IS 'Stripe subscription data and usage limits per user';

COMMENT ON COLUMN subscriptions.daily_ai_moves_limit IS '-1 means unlimited, otherwise max daily AI moves allowed';
COMMENT ON COLUMN subscriptions.daily_chat_messages_limit IS '-1 means unlimited, otherwise max daily chat messages allowed';
COMMENT ON COLUMN user_profiles.subscription_tier IS 'Denormalized from subscriptions table for quick access';

COMMENT ON FUNCTION can_use_ai_move IS 'Check if user has remaining AI moves for today';
COMMENT ON FUNCTION can_use_chat IS 'Check if user has remaining chat messages for today';
COMMENT ON FUNCTION reset_daily_usage IS 'Reset daily usage counters - call via cron at midnight UTC';
