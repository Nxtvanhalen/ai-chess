import { Chess } from 'chess.js';

// Simple chess engine using minimax with basic evaluation
export class ChessEngine {
  private evaluatePosition(chess: Chess): number {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -10000 : 10000;
    }
    if (chess.isDraw()) return 0;
    
    const pieceValues: { [key: string]: number } = {
      'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
    };
    
    let evaluation = 0;
    const board = chess.board();
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          let value = pieceValues[piece.type];
          // Black pieces are positive (AI), white pieces are negative
          evaluation += piece.color === 'b' ? value : -value;
          
          // Add positional bonuses
          if (piece.type === 'p') {
            // Pawns advance toward center
            evaluation += piece.color === 'b' ? (7 - i) * 0.1 : i * 0.1;
          }
          if (piece.type === 'n' || piece.type === 'b') {
            // Knights and bishops prefer center
            const centerDistance = Math.abs(3.5 - i) + Math.abs(3.5 - j);
            evaluation += piece.color === 'b' ? (4 - centerDistance) * 0.1 : -(4 - centerDistance) * 0.1;
          }
        }
      }
    }
    
    // Add mobility bonus
    const moves = chess.moves().length;
    evaluation += chess.turn() === 'b' ? moves * 0.05 : -moves * 0.05;
    
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
    
    // Reduced depth for faster moves
    const depth = { easy: 1, medium: 2, hard: 3 }[difficulty];
    
    let bestMoves: string[] = [];
    let bestEval = -Infinity;
    
    for (const move of moves) {
      chess.move(move);
      const evaluation = this.minimax(chess, depth - 1, false);
      chess.undo();
      
      if (evaluation > bestEval) {
        bestEval = evaluation;
        bestMoves = [move];
      } else if (evaluation === bestEval) {
        bestMoves.push(move);
      }
    }
    
    // Add randomness by picking from equally good moves
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }
}