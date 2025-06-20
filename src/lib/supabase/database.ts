import { supabase } from './client';
import { ChatMessage, Game, GameMove } from '@/types';

// Game management
export async function createGame(playerColor: 'white' | 'black' = 'white') {
  const { data, error } = await supabase
    .from('games')
    .insert({
      status: 'active',
      player_color: playerColor,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Starting position
      pgn: '',
      metadata: { created_by: 'Chess Butler AI' }
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
      updated_at: new Date().toISOString()
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
      updated_at: new Date().toISOString()
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
  playerType: 'human' | 'ai'
) {
  const { data, error } = await supabase
    .from('moves')
    .insert({
      game_id: gameId,
      move_number: moveNumber,
      move_notation: moveNotation,
      fen_before: fenBefore,
      fen_after: fenAfter,
      player_type: playerType
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
      message_count: 0
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
  metadata?: any
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata: metadata || {}
    })
    .select()
    .single();

  if (error) throw error;

  // Update message count
  await supabase.rpc('increment_message_count', { 
    conversation_id: conversationId 
  });

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
  context: any = {}
) {
  const { data, error } = await supabase
    .from('memory')
    .insert({
      category,
      content,
      context,
      relevance_score: 1.0
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