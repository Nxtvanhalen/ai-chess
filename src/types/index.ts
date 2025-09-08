import { Move as ChessMove } from 'chess.js';

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