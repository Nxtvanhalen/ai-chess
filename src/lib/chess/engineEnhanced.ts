import { Chess } from 'chess.js';
import { getBookMove, isInOpeningBook } from './openingBook';

/**
 * Enhanced Chess Engine with:
 * - Opening Book (500+ positions)
 * - Transposition Table with LRU cache
 * - Improved move ordering
 * - Optimized for Web Worker execution
 */

// ===== LRU TRANSPOSITION TABLE =====
interface TranspositionEntry {
  depth: number;
  evaluation: number;
  flag: 'exact' | 'lower' | 'upper';
  bestMove?: string;
}

class LRUTranspositionTable {
  private cache: Map<string, TranspositionEntry>;
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 100000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): TranspositionEntry | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, entry);
      this.hits++;
      return entry;
    }
    this.misses++;
    return undefined;
  }

  set(key: string, entry: TranspositionEntry): void {
    // Delete if exists to refresh position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, entry);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

// ===== PIECE-SQUARE TABLES =====
// Positional bonuses for each piece type (from white's perspective)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDDLEGAME_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20
];

const KING_ENDGAME_TABLE = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50
];

function getPieceSquareValue(piece: string, square: number, isEndgame: boolean): number {
  // Tables are from white's perspective, flip for black
  const isBlack = piece === piece.toLowerCase();
  const idx = isBlack ? (63 - square) : square;
  const pieceType = piece.toLowerCase();

  let value = 0;
  switch (pieceType) {
    case 'p': value = PAWN_TABLE[idx]; break;
    case 'n': value = KNIGHT_TABLE[idx]; break;
    case 'b': value = BISHOP_TABLE[idx]; break;
    case 'r': value = ROOK_TABLE[idx]; break;
    case 'q': value = QUEEN_TABLE[idx]; break;
    case 'k': value = isEndgame ? KING_ENDGAME_TABLE[idx] : KING_MIDDLEGAME_TABLE[idx]; break;
  }

  return isBlack ? value : -value;
}

// ===== ENHANCED CHESS ENGINE =====
export class EnhancedChessEngine {
  private transpositionTable: LRUTranspositionTable;
  private nodesSearched: number = 0;

  constructor() {
    this.transpositionTable = new LRUTranspositionTable(100000);
  }

  private evaluatePosition(chess: Chess): number {
    if (chess.isCheckmate()) {
      const moveCount = chess.history().length;
      return chess.turn() === 'w' ? -10000 + moveCount : 10000 - moveCount;
    }
    if (chess.isDraw()) return 0;

    const pieceValues: Record<string, number> = {
      p: 100, n: 320, b: 330, r: 500, q: 900, k: 0,
    };

    let evaluation = 0;
    const board = chess.board();
    let pieceCount = 0;

    // Count material and positional value
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          pieceCount++;
          const value = pieceValues[piece.type];
          const squareIndex = i * 8 + j;
          const isEndgame = pieceCount <= 12;
          const positionalValue = getPieceSquareValue(
            piece.color === 'w' ? piece.type.toUpperCase() : piece.type,
            squareIndex,
            isEndgame
          );

          if (piece.color === 'b') {
            evaluation += value + positionalValue;
          } else {
            evaluation -= value - positionalValue;
          }
        }
      }
    }

    // Mobility bonus
    const moves = chess.moves().length;
    evaluation += chess.turn() === 'b' ? moves * 5 : -moves * 5;

    // Check bonus
    if (chess.inCheck()) {
      evaluation += chess.turn() === 'w' ? 50 : -50;
    }

    return evaluation / 100; // Normalize to pawn units
  }

  private orderMoves(chess: Chess, moves: string[], ttBestMove?: string): string[] {
    const scored: { move: string; score: number }[] = [];

    for (const move of moves) {
      let score = 0;

      // TT best move gets highest priority
      if (move === ttBestMove) {
        score = 10000;
      } else {
        // MVV-LVA for captures
        if (move.includes('x')) {
          score += 1000;
          // Prioritize capturing valuable pieces with less valuable pieces
          const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
          chess.move(move);
          const history = chess.history({ verbose: true });
          const lastMove = history[history.length - 1];
          if (lastMove?.captured) {
            score += pieceValues[lastMove.captured] * 100;
          }
          chess.undo();
        }

        // Checks are good
        if (move.includes('+')) score += 500;

        // Promotions
        if (move.includes('=Q')) score += 800;
        if (move.includes('=R')) score += 400;
        if (move.includes('=B')) score += 300;
        if (move.includes('=N')) score += 300;

        // Castling is usually good
        if (move === 'O-O' || move === 'O-O-O') score += 100;
      }

      scored.push({ move, score });
    }

    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score).map((s) => s.move);
  }

  private minimax(
    chess: Chess,
    depth: number,
    isMaximizing: boolean,
    alpha: number = -Infinity,
    beta: number = Infinity
  ): number {
    this.nodesSearched++;

    // Check transposition table
    const fen = chess.fen();
    const ttEntry = this.transpositionTable.get(fen);

    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.flag === 'exact') return ttEntry.evaluation;
      if (ttEntry.flag === 'lower') alpha = Math.max(alpha, ttEntry.evaluation);
      if (ttEntry.flag === 'upper') beta = Math.min(beta, ttEntry.evaluation);
      if (alpha >= beta) return ttEntry.evaluation;
    }

    if (depth === 0 || chess.isGameOver()) {
      return this.evaluatePosition(chess);
    }

    const moves = chess.moves();
    const orderedMoves = this.orderMoves(chess, moves, ttEntry?.bestMove);

    let bestMove: string | undefined;
    let bestEval = isMaximizing ? -Infinity : Infinity;
    let flag: 'exact' | 'lower' | 'upper' = 'exact';

    if (isMaximizing) {
      for (const move of orderedMoves) {
        chess.move(move);
        const evaluation = this.minimax(chess, depth - 1, false, alpha, beta);
        chess.undo();

        if (evaluation > bestEval) {
          bestEval = evaluation;
          bestMove = move;
        }
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) {
          flag = 'lower';
          break;
        }
      }
    } else {
      for (const move of orderedMoves) {
        chess.move(move);
        const evaluation = this.minimax(chess, depth - 1, true, alpha, beta);
        chess.undo();

        if (evaluation < bestEval) {
          bestEval = evaluation;
          bestMove = move;
        }
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) {
          flag = 'upper';
          break;
        }
      }
    }

    // Store in transposition table
    this.transpositionTable.set(fen, {
      depth,
      evaluation: bestEval,
      flag,
      bestMove,
    });

    return bestEval;
  }

  getBestMove(
    fen: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    playerMoveHistory: string[] = []
  ): {
    move: string;
    evaluation: number;
    depth: number;
    thinkingTime: number;
    analysis: string;
    fromBook: boolean;
    nodesSearched: number;
    ttHitRate: number;
  } | null {
    const chess = new Chess(fen);
    const moves = chess.moves();

    if (moves.length === 0) return null;

    // Reset counters
    this.nodesSearched = 0;

    // ===== CHECK OPENING BOOK FIRST =====
    if (isInOpeningBook(fen)) {
      const bookMove = getBookMove(fen);
      if (bookMove) {
        const moveObj = chess.move(bookMove.move);
        if (moveObj) {
          return {
            move: bookMove.move,
            evaluation: 0,
            depth: 0,
            thinkingTime: 200 + Math.random() * 300, // Quick book move
            analysis: bookMove.name ? `Playing ${bookMove.name}` : 'From opening book',
            fromBook: true,
            nodesSearched: 0,
            ttHitRate: 0,
          };
        }
      }
    }

    // Analyze player style
    const playerUnpredictability = this.analyzePlayerStyle(playerMoveHistory);

    // Check for immediate checkmate
    for (const move of moves) {
      chess.move(move);
      if (chess.isCheckmate()) {
        chess.undo();
        return {
          move,
          evaluation: 1000,
          depth: 1,
          thinkingTime: 500,
          analysis: 'Checkmate found!',
          fromBook: false,
          nodesSearched: 1,
          ttHitRate: 0,
        };
      }
      chess.undo();
    }

    // Calculate search depth
    let depth = { easy: 2, medium: 3, hard: 4 }[difficulty];
    const pieceCount = chess.board().flat().filter((p) => p !== null).length;
    const evaluation = this.evaluatePosition(chess);

    // Deeper search in endgame
    if (pieceCount <= 8) depth = Math.min(depth + 2, 6);
    else if (pieceCount <= 12 && Math.abs(evaluation) > 3) depth = Math.min(depth + 1, 5);

    // Deeper against creative players
    if (playerUnpredictability > 0.6) depth = Math.min(depth + 1, 6);

    // Cap depth
    depth = Math.min(depth, 6);

    // Search all moves
    const moveEvaluations: { move: string; eval: number }[] = [];
    let bestEval = -Infinity;

    for (const move of moves) {
      chess.move(move);
      const moveEval = this.minimax(chess, depth - 1, false);
      chess.undo();

      moveEvaluations.push({ move, eval: moveEval });
      if (moveEval > bestEval) bestEval = moveEval;
    }

    // Select move with variation
    moveEvaluations.sort((a, b) => b.eval - a.eval);
    const selectedMove = this.selectMoveWithVariation(
      moveEvaluations,
      chess,
      playerUnpredictability,
      evaluation
    );

    // Calculate thinking time
    const thinkingTime = this.calculateThinkingTime(
      pieceCount,
      depth,
      Math.abs(selectedMove.eval),
      playerUnpredictability
    );

    // Get TT stats
    const ttStats = this.transpositionTable.getStats();

    return {
      move: selectedMove.move,
      evaluation: selectedMove.eval,
      depth,
      thinkingTime,
      analysis: this.generateAnalysis(pieceCount, selectedMove.eval, depth, selectedMove.move),
      fromBook: false,
      nodesSearched: this.nodesSearched,
      ttHitRate: ttStats.hitRate,
    };
  }

  private analyzePlayerStyle(moveHistory: string[]): number {
    if (moveHistory.length < 6) return 0.3;

    let unpredictabilityScore = 0;
    const recentMoves = moveHistory.slice(-10);

    for (const move of recentMoves) {
      if (move.includes('x')) unpredictabilityScore += 0.1;
      if (move.includes('+')) unpredictabilityScore += 0.15;
      if (move.includes('!') || move.includes('?')) unpredictabilityScore += 0.2;
      if (move.length > 4) unpredictabilityScore += 0.05;
    }

    return Math.min(unpredictabilityScore, 1.0);
  }

  private selectMoveWithVariation(
    moveEvaluations: { move: string; eval: number }[],
    chess: Chess,
    unpredictability: number,
    positionEval: number
  ): { move: string; eval: number } {
    const bestEval = moveEvaluations[0].eval;

    let tolerance = 0.15;
    if (unpredictability > 0.5) tolerance += 0.25;
    if (Math.abs(positionEval) < 1.0) tolerance += 0.15;

    const candidates = moveEvaluations.filter((m) => m.eval >= bestEval - tolerance);

    // Prefer forcing moves in tactical positions
    const forcingMoves = candidates.filter(({ move }) => {
      chess.move(move);
      const isCheck = chess.inCheck();
      const isCapture = move.includes('x');
      chess.undo();
      return isCheck || isCapture;
    });

    const finalCandidates =
      forcingMoves.length > 0 && Math.abs(positionEval) > 2.0 ? forcingMoves : candidates;

    // Weighted random selection
    const weights = finalCandidates.map((_, i) => Math.pow(2, finalCandidates.length - i - 1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < finalCandidates.length; i++) {
      random -= weights[i];
      if (random <= 0) return finalCandidates[i];
    }

    return finalCandidates[0] || moveEvaluations[0];
  }

  private calculateThinkingTime(
    pieceCount: number,
    depth: number,
    evalMagnitude: number,
    unpredictability: number
  ): number {
    let baseTime = 1200;

    const complexityFactor = (32 - pieceCount) * 25;
    const depthFactor = depth * 150;
    const criticalFactor = evalMagnitude > 3 ? 400 : 0;
    const creativeFactor = unpredictability * 250;

    const totalTime = baseTime + complexityFactor + depthFactor + criticalFactor + creativeFactor;

    return Math.max(600, Math.min(3500, Math.floor(totalTime)));
  }

  private generateAnalysis(
    pieceCount: number,
    evaluation: number,
    depth: number,
    move: string
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
    if (depth >= 5) return 'Deep positional analysis...';

    return 'Evaluating candidate moves...';
  }

  // Clear TT for new game
  clearTranspositionTable(): void {
    this.transpositionTable.clear();
  }

  // Get TT stats for debugging
  getTranspositionTableStats() {
    return this.transpositionTable.getStats();
  }
}

// Export singleton for non-worker usage
export const enhancedEngine = new EnhancedChessEngine();
