-- ============================================================================
-- Migration 007: Definitive RLS fix for anonymous users
-- Drops all conflicting policies and recreates with proper anonymous support
-- ============================================================================

-- ============================================================================
-- GAME_MEMORY TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own game_memory" ON game_memory;
DROP POLICY IF EXISTS "Users can create game_memory entries" ON game_memory;
DROP POLICY IF EXISTS "Users can update own game_memory" ON game_memory;

CREATE POLICY "Users can view own game_memory"
  ON game_memory FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create game_memory entries"
  ON game_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own game_memory"
  ON game_memory FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- CHESTER_LONG_TERM_MEMORY TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own chester_memory" ON chester_long_term_memory;
DROP POLICY IF EXISTS "Users can create chester_memory entries" ON chester_long_term_memory;
DROP POLICY IF EXISTS "Users can update own chester_memory" ON chester_long_term_memory;

CREATE POLICY "Users can view own chester_memory"
  ON chester_long_term_memory FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create chester_memory entries"
  ON chester_long_term_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own chester_memory"
  ON chester_long_term_memory FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- GAMES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own games" ON games;
DROP POLICY IF EXISTS "Users can create games" ON games;
DROP POLICY IF EXISTS "Users can update own games" ON games;
DROP POLICY IF EXISTS "Users can delete own games" ON games;

CREATE POLICY "Users can view own games"
  ON games FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create games"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own games"
  ON games FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own games"
  ON games FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- MESSAGES TABLE (through conversation)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view messages from own conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON messages;

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
      AND (conversations.user_id = auth.uid() OR conversations.user_id IS NULL)
    )
  );

-- ============================================================================
-- MEMORY TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own memory" ON memory;
DROP POLICY IF EXISTS "Users can create memory entries" ON memory;
DROP POLICY IF EXISTS "Users can update own memory" ON memory;

CREATE POLICY "Users can view own memory"
  ON memory FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create memory entries"
  ON memory FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own memory"
  ON memory FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- MOVES TABLE (through game)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view moves from own games" ON moves;
DROP POLICY IF EXISTS "Users can insert moves to own games" ON moves;

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
      AND (games.user_id = auth.uid() OR games.user_id IS NULL)
    )
  );

-- ============================================================================
-- GAME_MEMORY_SNAPSHOTS TABLE (through game_memory)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own game_memory_snapshots" ON game_memory_snapshots;
DROP POLICY IF EXISTS "Users can insert game_memory_snapshots to own game_memory" ON game_memory_snapshots;

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
      AND (game_memory.user_id = auth.uid() OR game_memory.user_id IS NULL)
    )
  );
