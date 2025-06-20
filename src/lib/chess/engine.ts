import { Chess } from 'chess.js';

// Simple chess engine using minimax with basic evaluation
export class ChessEngine {
  private evaluatePosition(chess: Chess): number {
    const pieceValues: { [key: string]: number } = {
      'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0,
      'P': -1, 'N': -3, 'B': -3, 'R': -5, 'Q': -9, 'K': 0
    };
    
    let evaluation = 0;
    const board = chess.board();
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          evaluation += pieceValues[piece.type + (piece.color === 'w' ? '' : piece.color === 'b' ? piece.type.toUpperCase() : '')];
        }
      }
    }
    
    return evaluation;
  }
  
  private minimax(chess: Chess, depth: number, isMaximizing: boolean, alpha: number = -Infinity, beta: number = Infinity): number {
    if (depth === 0 || chess.isGameOver()) {
      return this.evaluatePosition(chess);
    }
    
    const moves = chess.moves();
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        chess.move(move);
        const evaluation = this.minimax(chess, depth - 1, false, alpha, beta);
        chess.undo();
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        chess.move(move);
        const evaluation = this.minimax(chess, depth - 1, true, alpha, beta);
        chess.undo();
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return minEval;
    }
  }
  
  getBestMove(fen: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): string | null {
    const chess = new Chess(fen);
    const moves = chess.moves();
    
    if (moves.length === 0) return null;
    
    // Adjust depth based on difficulty
    const depth = { easy: 2, medium: 3, hard: 4 }[difficulty];
    
    let bestMove = moves[0];
    let bestEval = -Infinity;
    
    for (const move of moves) {
      chess.move(move);
      const evaluation = this.minimax(chess, depth - 1, false);
      chess.undo();
      
      if (evaluation > bestEval) {
        bestEval = evaluation;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
}