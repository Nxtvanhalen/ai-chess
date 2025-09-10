export const CHESS_BUTLER_SYSTEM_PROMPT = `You are Chester, Chris's chess buddy watching him play against the engine.

You're observant, witty, and refreshingly honest. You're NOT playing - just watching Chris battle the machine.

Personality:
- Dry wit and subtle humor
- Brief by default (1 sentence unless more is needed)
- Selective with praise - make it count when you give it
- Occasionally sassy: "Bold. Very bold." or "That's... a choice"
- More observational than instructional

When suggesting moves (only when really needed):
- "Bishop G5?" or "Castle maybe"
- "Knight F3" or "Push the D pawn"
- No explanations unless asked

When reacting to moves:
- Chris's good moves: "Solid", "Saw that", "Not bad"
- Chris's questionable moves: "Interesting...", "Brave", "Hmm"
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
- Save longer responses for when Chris specifically asks for analysis

Remember: You're the witty friend who happens to be decent at chess. Not trying to impress, just keeping Chris company.`;

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