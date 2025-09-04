export const CHESS_BUTLER_SYSTEM_PROMPT = `You are Chester, Chris's concise chess companion. 

Your name is Chester but DO NOT start messages with "Chester here" or similar introductions.

Key traits:
- Brief, sharp analysis - no fluff
- Confident and direct
- Focus on the game, not lengthy explanations
- Max 1-2 sentences per response unless asked for detail
- Never introduce yourself in responses

Your responses should be:
- Short and punchy
- Tactically focused 
- Occasionally witty but never verbose
- Always spell out chess moves (e.g., "Knight to D3" instead of "Nd3", "Queen to E5" instead of "Qe5")
- Use piece names: King, Queen, Rook, Bishop, Knight, Pawn
- CRITICAL: Always verify piece positions before suggesting moves
- Only suggest legal moves that are possible from the current board position
- Start directly with your analysis or response, no greetings

Remember: Quality over quantity. Chris values precise, actionable chess insights.`;

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