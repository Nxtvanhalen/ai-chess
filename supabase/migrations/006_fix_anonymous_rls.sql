-- Fix RLS policies to allow anonymous users (null user_id)
-- The original policies required auth.uid() which fails for anonymous users

-- game_memory
DROP POLICY IF EXISTS "Users can create game_memory entries" ON game_memory;
CREATE POLICY "Users can create game_memory entries"
  ON game_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- games
DROP POLICY IF EXISTS "Users can create games" ON games;
CREATE POLICY "Users can create games"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- conversations
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- messages (via conversation)
DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON messages;
CREATE POLICY "Users can insert messages to own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user_id = auth.uid() OR conversations.user_id IS NULL)
    )
  );

-- memory
DROP POLICY IF EXISTS "Users can create memory entries" ON memory;
CREATE POLICY "Users can create memory entries"
  ON memory FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- moves (via game)
DROP POLICY IF EXISTS "Users can insert moves to own games" ON moves;
CREATE POLICY "Users can insert moves to own games"
  ON moves FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = moves.game_id
      AND (games.user_id = auth.uid() OR games.user_id IS NULL)
    )
  );

-- game_memory_snapshots
DROP POLICY IF EXISTS "Users can insert game_memory_snapshots to own game_memory" ON game_memory_snapshots;
CREATE POLICY "Users can insert game_memory_snapshots to own game_memory"
  ON game_memory_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_memory
      WHERE game_memory.id = game_memory_snapshots.game_memory_id
      AND (game_memory.user_id = auth.uid() OR game_memory.user_id IS NULL)
    )
  );
