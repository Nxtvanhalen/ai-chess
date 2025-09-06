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

export const formatMoveContext = (fen: string, lastMove?: string) => {
  const chess = new Chess(fen);
  
  // Generate human-readable piece positions
  const board = chess.board();
  const whitePieces: string[] = [];
  const blackPieces: string[] = [];
  
  // Map piece types to full names
  const pieceNames: Record<string, string> = {
    'k': 'King',
    'q': 'Queen',
    'r': 'Rook',
    'b': 'Bishop',
    'n': 'Knight',
    'p': 'Pawn'
  };
  
  // Scan the board and list all pieces
  for (let rank = 8; rank >= 1; rank--) {
    for (let file = 0; file < 8; file++) {
      const square = String.fromCharCode(97 + file) + rank;
      const piece = chess.get(square as any);
      if (piece) {
        const pieceName = pieceNames[piece.type];
        const pieceLocation = `${pieceName} on ${square.toUpperCase()}`;
        if (piece.color === 'w') {
          whitePieces.push(pieceLocation);
        } else {
          blackPieces.push(pieceLocation);
        }
      }
    }
  }
  
  // Get legal moves in readable format
  const legalMoves = chess.moves({ verbose: true });
  const formattedMoves = legalMoves.map(move => {
    const piece = pieceNames[move.piece];
    const from = move.from.toUpperCase();
    const to = move.to.toUpperCase();
    const capture = move.captured ? ` (captures ${pieceNames[move.captured]})` : '';
    return `${piece} from ${from} to ${to}${capture}`;
  }).slice(0, 10); // Limit to first 10 moves to avoid overwhelming the context
  
  // Build comprehensive context
  let context = `Current position (FEN): ${fen}\n`;
  context += `\nWHITE PIECES:\n${whitePieces.join(', ')}\n`;
  context += `\nBLACK PIECES:\n${blackPieces.join(', ')}\n`;
  context += `\nTurn to move: ${chess.turn() === 'w' ? 'White' : 'Black'}\n`;
  
  if (chess.isCheck()) {
    context += `\nKING IN CHECK!\n`;
  }
  
  if (chess.isCheckmate()) {
    context += `\nCHECKMATE! Game Over.\n`;
  } else if (chess.isDraw()) {
    context += `\nDRAW! Game Over.\n`;
  } else if (formattedMoves.length > 0) {
    context += `\nSample legal moves available:\n${formattedMoves.join('\n')}\n`;
    if (legalMoves.length > 10) {
      context += `(... and ${legalMoves.length - 10} more legal moves)\n`;
    }
  }
  
  if (lastMove) {
    context += `\nLast move played: ${lastMove}\n`;
  }
  
  return context;
};