-- Performance indexes for AI Chess database

-- Games indexes
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_created_at ON games(created_at DESC);

-- Moves indexes  
CREATE INDEX idx_moves_game_id ON moves(game_id);
CREATE INDEX idx_moves_game_move_number ON moves(game_id, move_number);
CREATE INDEX idx_moves_player_type ON moves(player_type);

-- Conversations indexes
CREATE INDEX idx_conversations_game_id ON conversations(game_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Messages indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_role ON messages(role);

-- Memory indexes
CREATE INDEX idx_memory_category ON memory(category);
CREATE INDEX idx_memory_relevance ON memory(relevance_score DESC);
CREATE INDEX idx_memory_last_accessed ON memory(last_accessed DESC);