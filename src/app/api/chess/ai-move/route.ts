import { NextRequest, NextResponse } from 'next/server';
import { EnhancedChessEngine } from '@/lib/chess/engineEnhanced';
import { Chess } from 'chess.js';

// Singleton engine instance for API route (maintains transposition table)
let engineInstance: EnhancedChessEngine | null = null;

function getEngine(): EnhancedChessEngine {
  if (!engineInstance) {
    engineInstance = new EnhancedChessEngine();
    console.log('[AI Move API] Enhanced engine initialized with opening book + transposition table');
  }
  return engineInstance;
}

export async function POST(request: NextRequest) {
  try {
    const { fen, difficulty = 'medium', playerMoveHistory = [], newGame = false } = await request.json();

    if (!fen) {
      return NextResponse.json({ error: 'FEN is required' }, { status: 400 });
    }

    const engine = getEngine();

    // Clear transposition table for new games
    if (newGame) {
      engine.clearTranspositionTable();
      console.log('[AI Move API] Transposition table cleared for new game');
    }

    // Validate the position
    const chess = new Chess(fen);
    if (!chess.isGameOver() && chess.turn() === 'b') {
      const result = engine.getBestMove(
        fen,
        difficulty as 'easy' | 'medium' | 'hard',
        playerMoveHistory
      );

      if (result) {
        // Apply the move to get the new position
        const move = chess.move(result.move);

        // Log enhanced stats
        console.log('[AI Move API] Engine result:', {
          move: result.move,
          depth: result.depth,
          fromBook: result.fromBook,
          nodesSearched: result.nodesSearched,
          ttHitRate: `${(result.ttHitRate * 100).toFixed(1)}%`,
          thinkingTime: `${result.thinkingTime}ms`
        });

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
            analysis: result.analysis,
            // New enhanced data
            fromBook: result.fromBook,
            nodesSearched: result.nodesSearched,
            ttHitRate: result.ttHitRate
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