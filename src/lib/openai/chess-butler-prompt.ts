export const CHESS_BUTLER_SYSTEM_PROMPT = `You are Chester, Chris's chess buddy who's watching him play against a chess engine.

You're like a friend sitting next to Chris, casually watching the game and chatting. You're NOT playing - you're observing Chris play against the engine.

Personality:
- Casual and friendly, like you're hanging out over coffee
- Brief comments (1-2 sentences max usually)
- React naturally: "Nice!", "Hmm, risky", "Oh that's interesting"
- Sometimes comment on the engine: "The engine's being aggressive", "It's setting up something"
- Occasionally reference past games: "Remember last time?", "Classic Chris move"

When suggesting moves (keep it to 1-2 simple options):
- "Maybe try Bishop to G5?" or "I'd probably castle here"
- "Knight to F3 looks solid" or "Could push that D pawn"
- Don't over-explain - just casual suggestions like a friend would

When reacting to moves:
- Chris's moves: "Good call", "Interesting choice", "Playing it safe, I see"
- Engine moves: "The engine's going for it", "Typical computer move", "Didn't see that coming"

Important:
- Use simple move descriptions: "Knight to D4" not "Nd4"
- Keep it conversational and natural
- You're Chris's friend watching him play, not a chess teacher
- Vary your responses to avoid sounding robotic
- Add occasional personality: "This is getting spicy", "Things are heating up"

Remember: You're hanging out with Chris while he plays chess. Keep it light and friendly.`;

import { Chess } from 'chess.js';
import { PositionAnalyzer } from '../chess/positionAnalyzer';

export const formatMoveContext = (fen: string, lastMove?: string) => {
  const chess = new Chess(fen);
  const analyzer = new PositionAnalyzer(fen);
  const analysis = analyzer.analyzePosition();
  
  // Map piece types to full names
  const pieceNames: Record<string, string> = {
    'k': 'King',
    'q': 'Queen', 
    'r': 'Rook',
    'b': 'Bishop',
    'n': 'Knight',
    'p': 'Pawn'
  };
  
  // Get legal moves in readable format (limit for brevity)
  const legalMoves = chess.moves({ verbose: true });
  const formattedMoves = legalMoves.map(move => {
    const piece = pieceNames[move.piece];
    const from = move.from.toUpperCase();
    const to = move.to.toUpperCase();
    const capture = move.captured ? ` (captures ${pieceNames[move.captured]})` : '';
    return `${piece} from ${from} to ${to}${capture}`;
  }).slice(0, 8);
  
  // Build tactical context
  let context = `POSITION ANALYSIS:\n`;
  context += `Turn to move: ${chess.turn() === 'w' ? 'White (Chris)' : 'Black'}\n`;
  context += `Game phase: ${analysis.gamePhase.toUpperCase()}\n`;
  context += `Urgency level: ${analysis.urgencyLevel.toUpperCase()}\n\n`;
  
  // Material situation
  context += `MATERIAL COUNT:\n`;
  const material = analysis.materialCount;
  context += `White: Q:${material.white.q} R:${material.white.r} B:${material.white.b} N:${material.white.n} P:${material.white.p} (${material.whiteTotal} points)\n`;
  context += `Black: Q:${material.black.q} R:${material.black.r} B:${material.black.b} N:${material.black.n} P:${material.black.p} (${material.blackTotal} points)\n`;
  
  if (Math.abs(material.imbalance) >= 1) {
    const leader = material.imbalance > 0 ? 'Chris' : 'Engine';
    context += `MATERIAL IMBALANCE: ${leader} is ahead by ${Math.abs(material.imbalance)} points\n`;
  }
  
  // Critical threats
  if (analysis.threats.length > 0) {
    context += `\nIMMEDIATE THREATS:\n`;
    const urgentThreats = analysis.threats.slice(0, 3);
    urgentThreats.forEach(threat => {
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
    analysis.recommendations.forEach(rec => {
      context += `- ${rec}\n`;
    });
  }
  
  // Sample legal moves
  if (formattedMoves.length > 0) {
    context += `\nSAMPLE LEGAL MOVES:\n`;
    formattedMoves.forEach(move => context += `- ${move}\n`);
    if (legalMoves.length > 8) {
      context += `(... and ${legalMoves.length - 8} more moves available)\n`;
    }
  }
  
  if (lastMove) {
    context += `\nLast move played: ${lastMove}\n`;
  }
  
  return context;
};