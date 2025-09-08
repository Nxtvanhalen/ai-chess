import { NextRequest, NextResponse } from 'next/server';
import { ChessEngine } from '@/lib/chess/engine';
import { Chess } from 'chess.js';

export async function POST(request: NextRequest) {
  try {
    const { fen, difficulty = 'medium', playerMoveHistory = [] } = await request.json();
    
    if (!fen) {
      return NextResponse.json({ error: 'FEN is required' }, { status: 400 });
    }
    
    // Validate the position
    const chess = new Chess(fen);
    if (!chess.isGameOver() && chess.turn() === 'b') {
      const engine = new ChessEngine();
      const result = engine.getBestMove(
        fen, 
        difficulty as 'easy' | 'medium' | 'hard',
        playerMoveHistory
      );
      
      if (result) {
        // Apply the move to get the new position
        const move = chess.move(result.move);
        
        return NextResponse.json({
          move: result.move,
          san: move.san,
          fen: chess.fen(),
          from: move.from,
          to: move.to,
          // Enhanced analysis data
          analysis: {
            evaluation: result.evaluation,
            depth: result.depth,
            thinkingTime: result.thinkingTime,
            analysis: result.analysis
          }
        });
      }
    }
    
    return NextResponse.json({ error: 'No valid move found' }, { status: 400 });
  } catch (error) {
    console.error('AI move error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI move' },
      { status: 500 }
    );
  }
}