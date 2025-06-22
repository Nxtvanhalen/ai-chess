import { Chess } from 'chess.js';

// Simple chess engine using minimax with basic evaluation
export class ChessEngine {
  private evaluatePosition(chess: Chess): number {
    if (chess.isCheckmate()) {
      // Prefer faster checkmates
      const moveCount = chess.history().length;
      return chess.turn() === 'w' ? -10000 + moveCount : 10000 - moveCount;
    }
    if (chess.isDraw()) return 0;
    
    const pieceValues: { [key: string]: number } = {
      'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
    };
    
    let evaluation = 0;
    const board = chess.board();
    let whiteKingPos = { row: -1, col: -1 };
    let blackKingPos = { row: -1, col: -1 };
    const pieceCount = { white: 0, black: 0 };
    
    // First pass: count material and find kings
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          let value = pieceValues[piece.type];
          if (piece.color === 'b') {
            evaluation += value;
            pieceCount.black++;
            if (piece.type === 'k') blackKingPos = { row: i, col: j };
          } else {
            evaluation -= value;
            pieceCount.white++;
            if (piece.type === 'k') whiteKingPos = { row: i, col: j };
          }
          
          // Add positional bonuses
          if (piece.type === 'p') {
            // Pawns advance toward promotion
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
    
    // Endgame adjustments
    const totalPieces = pieceCount.white + pieceCount.black;
    const isEndgame = totalPieces <= 16;
    
    if (isEndgame) {
      // In endgame, king activity is crucial
      const whiteKingCenterDist = Math.abs(3.5 - whiteKingPos.row) + Math.abs(3.5 - whiteKingPos.col);
      const blackKingCenterDist = Math.abs(3.5 - blackKingPos.row) + Math.abs(3.5 - blackKingPos.col);
      
      // Active king bonus in endgame
      evaluation += (whiteKingCenterDist - blackKingCenterDist) * 0.2;
      
      // When winning, push enemy king to edge
      if (evaluation > 3) {
        const whiteKingEdgeDist = Math.min(
          whiteKingPos.row, 7 - whiteKingPos.row,
          whiteKingPos.col, 7 - whiteKingPos.col
        );
        evaluation += (3 - whiteKingEdgeDist) * 0.5;
      }
    }
    
    // Check and attack bonuses
    if (chess.inCheck()) {
      evaluation += chess.turn() === 'w' ? 0.5 : -0.5;
    }
    
    // Mobility with emphasis on opponent's limited moves
    const moves = chess.moves().length;
    if (chess.turn() === 'b') {
      evaluation += moves * 0.05;
      // Bonus for restricting opponent
      if (moves < 10) evaluation -= 0.3;
    } else {
      evaluation -= moves * 0.05;
      // Penalty when we have few moves
      if (moves < 10) evaluation += 0.3;
    }
    
    return evaluation;
  }
  
  private minimax(chess: Chess, depth: number, isMaximizing: boolean, alpha: number = -Infinity, beta: number = Infinity): number {
    if (depth === 0 || chess.isGameOver()) {
      return this.evaluatePosition(chess);
    }
    
    const moves = chess.moves();
    
    // Move ordering for better pruning - prioritize captures and checks
    const orderedMoves = moves.sort((a, b) => {
      const aCapture = a.includes('x') ? 1 : 0;
      const bCapture = b.includes('x') ? 1 : 0;
      const aCheck = a.includes('+') ? 1 : 0;
      const bCheck = b.includes('+') ? 1 : 0;
      return (bCapture + bCheck) - (aCapture + aCheck);
    });
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of orderedMoves) {
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
      for (const move of orderedMoves) {
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
    
    // First check for immediate checkmate
    for (const move of moves) {
      chess.move(move);
      if (chess.isCheckmate()) {
        chess.undo();
        return move;
      }
      chess.undo();
    }
    
    // Base depth - balanced for performance
    let depth = { easy: 1, medium: 2, hard: 3 }[difficulty];
    
    // Increase depth in endgame or when winning
    const evaluation = this.evaluatePosition(chess);
    const pieceCount = chess.board().flat().filter(p => p !== null).length;
    
    // Moderate depth increase in critical positions
    if (pieceCount <= 8) {
      // Very late endgame - look deeper for checkmate
      depth = Math.min(depth + 2, 4);
    } else if (pieceCount <= 12 && Math.abs(evaluation) > 5) {
      // Late endgame when winning/losing significantly
      depth = Math.min(depth + 1, 4);
    }
    
    // Cap maximum depth to prevent extreme slowness
    depth = Math.min(depth, 4);
    
    let bestMove = null;
    let bestEval = -Infinity;
    const moveEvaluations: { move: string; eval: number }[] = [];
    
    for (const move of moves) {
      chess.move(move);
      const evaluation = this.minimax(chess, depth - 1, false);
      chess.undo();
      
      moveEvaluations.push({ move, eval: evaluation });
      
      if (evaluation > bestEval) {
        bestEval = evaluation;
        bestMove = move;
      }
    }
    
    // Sort moves by evaluation to prioritize forcing moves
    moveEvaluations.sort((a, b) => b.eval - a.eval);
    
    // If multiple moves have similar evaluations, prefer checks and captures
    const topMoves = moveEvaluations.filter(m => m.eval >= bestEval - 0.1);
    
    for (const { move } of topMoves) {
      chess.move(move);
      const isCheck = chess.inCheck();
      chess.undo();
      
      // Prefer checks when winning
      if (isCheck && evaluation > 3) {
        return move;
      }
    }
    
    // Return the objectively best move (no randomness)
    return bestMove;
  }
}