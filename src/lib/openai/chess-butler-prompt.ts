export const CHESS_BUTLER_SYSTEM_PROMPT = `You are Chester, a chess buddy watching the player battle the engine.

You're observant, witty, and refreshingly honest. You're NOT playing - just watching them battle the machine.

Personality:
- Dry wit and subtle humor
- Brief by default (1 sentence unless more is needed)
- Selective with praise - make it count when you give it
- Occasionally sassy: "Bold. Very bold." or "That's... a choice"
- More observational than instructional

When suggesting moves (only when really needed):
- CRITICAL: ONLY suggest moves from the "ALL LEGAL MOVES" list provided in the board state
- Use format: "[Piece] to [Square]" (e.g., "Bishop to G5", "Knight to F3")
- If move involves capture, mention it: "Bishop to G5 takes Knight"
- NEVER suggest a move unless you can see it listed in the legal moves
- If you're unsure, reference the specific move from the list (e.g., "from the captures list: Bishop to G5")
- No explanations unless asked

When reacting to moves:
- Good moves: "Solid", "Saw that", "Not bad"
- Questionable moves: "Interesting...", "Brave", "Hmm"
- Engine moves: "Called it", "Machine's mad now", "Predictable"

Style guidelines:
- Default to 1 sentence, maybe 2 if crucial
- No eager exclamations or over-enthusiasm
- Deadpan > excited: "The queen's gone. That's unfortunate."
- Playful rivalry: "Engine's not gonna like that"
- Occasional dry observations: "We're trading everything today, I see"

Important:
- Simple move notation: "Knight to D4" not "Nd4"
- Less is more - brevity is key
- You're the friend who's good at chess but doesn't need to prove it
- Save longer responses for when they specifically ask for analysis

CRITICAL RULE - MOVE SUGGESTIONS:
When the board state is provided, you will see complete lists of ALL legal moves organized by:
- 🎯 Checking moves
- ⚔️ Captures
- 🏰 Castling
- 📈 Developing moves
- 📋 All moves by piece

ONLY suggest moves that appear in these lists. NEVER invent a move or suggest based on "chess principles" alone.
If suggesting "Bishop to E4", verify it appears in the Bishop's move list first.

The lists show EVERY legal move in the position. If a move isn't listed, it's ILLEGAL.

Remember: You're the witty friend who happens to be decent at chess. Not trying to impress, just keeping them company.`;

import { Chess } from 'chess.js';
import { PositionAnalyzer } from '../chess/positionAnalyzer';

export const formatMoveContext = (fen: string, lastMove?: string) => {
  const chess = new Chess(fen);
  const analyzer = new PositionAnalyzer(fen);
  const analysis = analyzer.analyzePosition();

  // Map piece types to full names
  const pieceNames: Record<string, string> = {
    k: 'King',
    q: 'Queen',
    r: 'Rook',
    b: 'Bishop',
    n: 'Knight',
    p: 'Pawn',
  };

  // Get ALL legal moves and categorize them
  const legalMoves = chess.moves({ verbose: true });

  // Categorize moves by type for better AI understanding
  const captures = legalMoves.filter((m) => m.captured);
  const checks = legalMoves.filter((m) => m.san.includes('+'));
  const castling = legalMoves.filter((m) => m.flags.includes('k') || m.flags.includes('q'));
  const developing = legalMoves.filter(
    (m) => (m.piece === 'n' || m.piece === 'b') && ['1', '8'].includes(m.from[1]), // Moving from back rank
  );

  // Group moves by piece for clarity
  const movesByPiece: Record<string, string[]> = {};
  legalMoves.forEach((move) => {
    const piece = pieceNames[move.piece];
    const from = move.from.toUpperCase();
    const to = move.to.toUpperCase();
    const capture = move.captured ? ` (captures ${pieceNames[move.captured]})` : '';
    const check = move.san.includes('+') ? ' CHECK!' : '';
    const moveStr = `${from}→${to}${capture}${check}`;

    if (!movesByPiece[piece]) {
      movesByPiece[piece] = [];
    }
    movesByPiece[piece].push(moveStr);
  });

  // Build tactical context
  let context = `POSITION ANALYSIS:\n`;
  context += `Turn to move: ${chess.turn() === 'w' ? 'White (Player)' : 'Black'}\n`;
  context += `Game phase: ${analysis.gamePhase.toUpperCase()}\n`;
  context += `Urgency level: ${analysis.urgencyLevel.toUpperCase()}\n\n`;

  // Material situation
  context += `MATERIAL COUNT:\n`;
  const material = analysis.materialCount;
  context += `White: Q:${material.white.q} R:${material.white.r} B:${material.white.b} N:${material.white.n} P:${material.white.p} (${material.whiteTotal} points)\n`;
  context += `Black: Q:${material.black.q} R:${material.black.r} B:${material.black.b} N:${material.black.n} P:${material.black.p} (${material.blackTotal} points)\n`;

  if (Math.abs(material.imbalance) >= 1) {
    const leader = material.imbalance > 0 ? 'Player' : 'Engine';
    context += `MATERIAL IMBALANCE: ${leader} is ahead by ${Math.abs(material.imbalance)} points\n`;
  }

  // Critical threats
  if (analysis.threats.length > 0) {
    context += `\nIMMEDIATE THREATS:\n`;
    const urgentThreats = analysis.threats.slice(0, 3);
    urgentThreats.forEach((threat) => {
      const pieceName = pieceNames[threat.piece.slice(1)];
      const owner = threat.piece.startsWith('w') ? 'White' : 'Black';
      context += `- ${owner} ${pieceName} on ${threat.square.toUpperCase()}`;
      if (threat.isHanging) {
        context += ' is HANGING (undefended!)';
      } else {
        context += ` attacked by ${threat.attackedBy.length} piece(s), defended by ${threat.defendedBy.length}`;
      }
      context += `\n`;
    });
  }

  // King safety
  const kingSafety = chess.turn() === 'w' ? analysis.kingSafety.white : analysis.kingSafety.black;
  if (!kingSafety.safe) {
    context += `\nKING SAFETY ALERT: `;
    if (chess.inCheck()) {
      context += `King in CHECK! Must respond immediately.\n`;
    } else {
      context += `King under threat from ${kingSafety.threats.length} attacker(s)\n`;
    }
  }

  // AI recommendations
  if (analysis.recommendations.length > 0) {
    context += `\nKEY INSIGHTS:\n`;
    analysis.recommendations.forEach((rec) => {
      context += `- ${rec}\n`;
    });
  }

  // COMPLETE legal moves organized by category and piece
  context += `\n=== ALL LEGAL MOVES (${legalMoves.length} total) ===\n`;

  // Priority moves first
  if (checks.length > 0) {
    context += `\n🎯 CHECKING MOVES (${checks.length}):\n`;
    checks.forEach((m) => {
      const piece = pieceNames[m.piece];
      context += `  ${piece}: ${m.from.toUpperCase()}→${m.to.toUpperCase()}\n`;
    });
  }

  if (captures.length > 0) {
    context += `\n⚔️ CAPTURES (${captures.length}):\n`;
    captures.slice(0, 10).forEach((m) => {
      const piece = pieceNames[m.piece];
      const captured = pieceNames[m.captured!];
      context += `  ${piece}: ${m.from.toUpperCase()}→${m.to.toUpperCase()} (takes ${captured})\n`;
    });
    if (captures.length > 10) {
      context += `  ... and ${captures.length - 10} more captures\n`;
    }
  }

  if (castling.length > 0) {
    context += `\n🏰 CASTLING:\n`;
    castling.forEach((m) => {
      const side = m.flags.includes('k') ? 'Kingside (O-O)' : 'Queenside (O-O-O)';
      context += `  ${side}\n`;
    });
  }

  if (developing.length > 0) {
    context += `\n📈 DEVELOPING MOVES (${developing.length}):\n`;
    developing.forEach((m) => {
      const piece = pieceNames[m.piece];
      context += `  ${piece}: ${m.from.toUpperCase()}→${m.to.toUpperCase()}\n`;
    });
  }

  // All moves grouped by piece type
  context += `\n📋 ALL MOVES BY PIECE:\n`;
  Object.entries(movesByPiece).forEach(([piece, moves]) => {
    context += `  ${piece} (${moves.length}): ${moves.join(', ')}\n`;
  });

  // Add opponent's threats - what can THEY do on their next turn?
  const opponentColor = chess.turn() === 'w' ? 'b' : 'w';
  const _opponentAnalyzer = new PositionAnalyzer(fen);

  // Switch perspective temporarily to see opponent's moves
  const fenParts = fen.split(' ');
  fenParts[1] = opponentColor;
  const opponentFen = fenParts.join(' ');

  try {
    const opponentChess = new Chess(opponentFen);
    const opponentMoves = opponentChess.moves({ verbose: true });
    const opponentCaptures = opponentMoves.filter((m) => m.captured);
    const opponentChecks = opponentMoves.filter((m) => m.san.includes('+'));

    context += `\n⚠️ OPPONENT'S THREATS (what ${chess.turn() === 'w' ? 'Black' : 'White'} can do next):\n`;

    if (opponentChecks.length > 0) {
      context += `  Checking moves available: ${opponentChecks.length}\n`;
      opponentChecks.slice(0, 3).forEach((m) => {
        const piece = pieceNames[m.piece];
        context += `    ${piece}: ${m.from.toUpperCase()}→${m.to.toUpperCase()}\n`;
      });
    }

    if (opponentCaptures.length > 0) {
      context += `  Can capture: ${opponentCaptures.length} pieces\n`;
      opponentCaptures.slice(0, 5).forEach((m) => {
        const piece = pieceNames[m.piece];
        const captured = pieceNames[m.captured!];
        context += `    ${piece} can take ${captured} on ${m.to.toUpperCase()}\n`;
      });
    }

    if (opponentChecks.length === 0 && opponentCaptures.length === 0) {
      context += `  No immediate threats detected\n`;
    }
  } catch (_e) {
    // If FEN manipulation fails, skip opponent analysis
  }

  if (lastMove) {
    context += `\nLast move played: ${lastMove}\n`;
  }

  return context;
};
