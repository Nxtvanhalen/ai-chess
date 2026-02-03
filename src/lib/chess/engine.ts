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
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
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
          const value = pieceValues[piece.type];
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
            evaluation +=
              piece.color === 'b' ? (4 - centerDistance) * 0.1 : -(4 - centerDistance) * 0.1;
          }
        }
      }
    }

    // Endgame adjustments
    const totalPieces = pieceCount.white + pieceCount.black;
    const isEndgame = totalPieces <= 16;

    if (isEndgame) {
      // In endgame, king activity is crucial
      const whiteKingCenterDist =
        Math.abs(3.5 - whiteKingPos.row) + Math.abs(3.5 - whiteKingPos.col);
      const blackKingCenterDist =
        Math.abs(3.5 - blackKingPos.row) + Math.abs(3.5 - blackKingPos.col);

      // Active king bonus in endgame
      evaluation += (whiteKingCenterDist - blackKingCenterDist) * 0.2;

      // When winning, push enemy king to edge
      if (evaluation > 3) {
        const whiteKingEdgeDist = Math.min(
          whiteKingPos.row,
          7 - whiteKingPos.row,
          whiteKingPos.col,
          7 - whiteKingPos.col,
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

  private minimax(
    chess: Chess,
    depth: number,
    isMaximizing: boolean,
    alpha: number = -Infinity,
    beta: number = Infinity,
  ): number {
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
      return bCapture + bCheck - (aCapture + aCheck);
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

  getBestMove(
    fen: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    playerMoveHistory: string[] = [],
  ): {
    move: string;
    evaluation: number;
    depth: number;
    thinkingTime: number;
    analysis: string;
  } | null {
    const chess = new Chess(fen);
    const moves = chess.moves();

    if (moves.length === 0) return null;

    // Analyze player unpredictability
    const playerUnpredictability = this.analyzePlayerStyle(playerMoveHistory);

    // First check for immediate checkmate
    for (const move of moves) {
      chess.move(move);
      if (chess.isCheckmate()) {
        chess.undo();
        return {
          move,
          evaluation: 1000,
          depth: 1,
          thinkingTime: 500, // Quick checkmate
          analysis: 'Checkmate found',
        };
      }
      chess.undo();
    }

    // Base depth - balanced for performance
    let depth = { easy: 1, medium: 2, hard: 3 }[difficulty];

    // Increase depth in endgame or when winning
    const evaluation = this.evaluatePosition(chess);
    const pieceCount = chess
      .board()
      .flat()
      .filter((p) => p !== null).length;

    // Moderate depth increase in critical positions
    if (pieceCount <= 8) {
      // Very late endgame - look deeper for checkmate
      depth = Math.min(depth + 2, 5);
    } else if (pieceCount <= 12 && Math.abs(evaluation) > 5) {
      // Late endgame when winning/losing significantly
      depth = Math.min(depth + 1, 4);
    }

    // Adaptive depth based on player unpredictability
    if (playerUnpredictability > 0.6) {
      depth = Math.min(depth + 1, 5); // Think deeper against creative players
    }

    // Cap maximum depth to prevent extreme slowness
    depth = Math.min(depth, 5);

    let _bestMove = null;
    let bestEval = -Infinity;
    const moveEvaluations: { move: string; eval: number }[] = [];

    // Evaluate all moves
    for (const move of moves) {
      chess.move(move);
      const evaluation = this.minimax(chess, depth - 1, false);
      chess.undo();

      moveEvaluations.push({ move, eval: evaluation });

      if (evaluation > bestEval) {
        bestEval = evaluation;
        _bestMove = move;
      }
    }

    // Sort moves by evaluation to prioritize forcing moves
    moveEvaluations.sort((a, b) => b.eval - a.eval);

    // Smart move selection with randomness
    const selectedMove = this.selectMoveWithVariation(
      moveEvaluations,
      chess,
      playerUnpredictability,
      evaluation,
    );

    // Calculate realistic thinking time
    const thinkingTime = this.calculateThinkingTime(
      pieceCount,
      depth,
      Math.abs(evaluation),
      playerUnpredictability,
    );

    // Generate analysis description
    const analysis = this.generateAnalysis(pieceCount, evaluation, depth, selectedMove.move);

    return {
      move: selectedMove.move,
      evaluation: selectedMove.eval,
      depth,
      thinkingTime,
      analysis,
    };
  }

  private analyzePlayerStyle(moveHistory: string[]): number {
    if (moveHistory.length < 6) return 0.3; // Default for new games

    let unpredictabilityScore = 0;
    const recentMoves = moveHistory.slice(-10); // Look at last 10 moves

    // Check for unusual moves (captures, checks, piece sacrifices)
    for (const move of recentMoves) {
      if (move.includes('x')) unpredictabilityScore += 0.1; // Captures
      if (move.includes('+')) unpredictabilityScore += 0.15; // Checks
      if (move.includes('!') || move.includes('?')) unpredictabilityScore += 0.2; // Tactical moves
      if (move.length > 4) unpredictabilityScore += 0.05; // Complex notation
    }

    // Normalize score between 0 and 1
    return Math.min(unpredictabilityScore, 1.0);
  }

  private selectMoveWithVariation(
    moveEvaluations: { move: string; eval: number }[],
    chess: Chess,
    unpredictability: number,
    positionEval: number,
  ): { move: string; eval: number } {
    const bestEval = moveEvaluations[0].eval;

    // Determine candidate pool based on position and player style
    let tolerance = 0.2; // Base tolerance for move selection

    if (unpredictability > 0.5) {
      tolerance += 0.3; // Wider selection against creative players
    }

    if (Math.abs(positionEval) < 1.0) {
      tolerance += 0.2; // More variation in equal positions
    }

    // Get candidate moves within tolerance
    const candidates = moveEvaluations.filter((m) => m.eval >= bestEval - tolerance);

    // Prefer forcing moves (checks, captures) among candidates
    const forcingMoves = candidates.filter(({ move }) => {
      chess.move(move);
      const isCheck = chess.inCheck();
      const isCapture = move.includes('x');
      chess.undo();
      return isCheck || isCapture;
    });

    // Use forcing moves if available and we're in a tactical position
    const finalCandidates =
      forcingMoves.length > 0 && Math.abs(positionEval) > 2.0 ? forcingMoves : candidates;

    // Weighted random selection (prefer better moves)
    const weights = finalCandidates.map((_, i) => 2 ** (finalCandidates.length - i - 1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const random = Math.random() * totalWeight;

    let weightSum = 0;
    for (let i = 0; i < finalCandidates.length; i++) {
      weightSum += weights[i];
      if (random <= weightSum) {
        return finalCandidates[i];
      }
    }

    // Fallback to best move
    return finalCandidates[0] || moveEvaluations[0];
  }

  private calculateThinkingTime(
    pieceCount: number,
    depth: number,
    evalMagnitude: number,
    unpredictability: number,
  ): number {
    const baseTime = 1500; // 1.5 seconds base

    // Complexity factors
    const complexityFactor = (32 - pieceCount) * 30; // More pieces = more thinking
    const depthFactor = depth * 200; // Deeper search = more time
    const criticalFactor = evalMagnitude > 3 ? 500 : 0; // Critical positions need more time
    const creativeFactor = unpredictability * 300; // Think longer against creative players

    const totalTime = baseTime + complexityFactor + depthFactor + criticalFactor + creativeFactor;

    // Clamp between 800ms and 4000ms for good UX
    return Math.max(800, Math.min(4000, Math.floor(totalTime)));
  }

  private generateAnalysis(
    pieceCount: number,
    evaluation: number,
    depth: number,
    move: string,
  ): string {
    const isEndgame = pieceCount <= 12;
    const isTactical = Math.abs(evaluation) > 2;
    const isCheck = move.includes('+');
    const isCapture = move.includes('x');

    if (isEndgame && isTactical) return 'Calculating endgame sequences...';
    if (isCheck && isCapture) return 'Analyzing tactical combination...';
    if (isCapture) return 'Evaluating material exchange...';
    if (isCheck) return 'Considering forcing moves...';
    if (isTactical) return 'Looking for tactical opportunities...';
    if (isEndgame) return 'Planning endgame technique...';
    if (depth >= 4) return 'Deep positional analysis...';

    return 'Evaluating candidate moves...';
  }
}
