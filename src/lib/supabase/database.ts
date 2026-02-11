import { supabase } from './client';

// Game management
export async function createGame(playerColor: 'white' | 'black' = 'white', userId?: string) {
  const { data, error } = await supabase
    .from('games')
    .insert({
      status: 'active',
      player_color: playerColor,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Starting position
      pgn: '',
      metadata: { created_by: 'Chess Butler AI' },
      ...(userId ? { user_id: userId } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGamePosition(gameId: string, fen: string, pgn: string) {
  const { data, error } = await supabase
    .from('games')
    .update({
      fen,
      pgn,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function finishGame(gameId: string, result: string) {
  const { data, error } = await supabase
    .from('games')
    .update({
      status: 'completed',
      result,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Move tracking
export async function saveMove(
  gameId: string,
  moveNumber: number,
  moveNotation: string,
  fenBefore: string,
  fenAfter: string,
  playerType: 'human' | 'ai',
) {
  const { data, error } = await supabase
    .from('moves')
    .insert({
      game_id: gameId,
      move_number: moveNumber,
      move_notation: moveNotation,
      fen_before: fenBefore,
      fen_after: fenAfter,
      player_type: playerType,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Conversation management
export async function createConversation(gameId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      game_id: gameId,
      message_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) throw error;

  // Update message count using direct database update
  try {
    const { data: currentConv } = await supabase
      .from('conversations')
      .select('message_count')
      .eq('id', conversationId)
      .single();

    if (currentConv) {
      await supabase
        .from('conversations')
        .update({
          message_count: (currentConv.message_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    }
  } catch (updateError) {
    console.warn('Message count update failed, continuing without it:', updateError);
  }

  return data;
}

export async function getConversationMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// Memory management for Chess Butler
export async function saveMemory(
  category: 'game_pattern' | 'conversation' | 'preference' | 'coaching' | 'player_style',
  content: string,
  context: Record<string, unknown> = {},
) {
  const { data, error } = await supabase
    .from('memory')
    .insert({
      category,
      content,
      context,
      relevance_score: 1.0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRelevantMemories(category?: string, limit: number = 10) {
  let query = supabase
    .from('memory')
    .select('*')
    .order('relevance_score', { ascending: false })
    .order('last_accessed', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Get recent games
export async function getRecentGames(limit: number = 5) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Get moves for a game
export async function getGameMoves(gameId: string) {
  const { data, error } = await supabase
    .from('moves')
    .select('*')
    .eq('game_id', gameId)
    .order('move_number', { ascending: true });

  if (error) throw error;
  return data;
}

// Get conversation for a game
export async function getGameConversation(gameId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Abandon a game (so it won't be restored on next load)
export async function abandonGame(gameId: string) {
  const { error } = await supabase
    .from('games')
    .update({
      status: 'abandoned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId);

  if (error) {
    // May fail on old games without user_id (RLS blocks update) — that's OK
    console.warn('[DB] abandonGame failed (likely old game without user_id):', error.message);
  }
}

// Get current active game
export async function getCurrentGame() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
  return data;
}
