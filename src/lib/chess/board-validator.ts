import { Chess } from 'chess.js';

/**
 * Validates if a move suggestion is legal in the current position
 */
export function validateMoveSuggestion(fen: string, moveDescription: string): {
  isValid: boolean;
  correctedMove?: string;
  error?: string;
} {
  try {
    const chess = new Chess(fen);
    
    // Parse common move formats from Chester's responses
    // Examples: "Bishop to E2", "Knight from B8 to C6", "Pawn to E4"
    const moveRegex = /(\w+)\s+(?:from\s+([A-H][1-8])\s+)?to\s+([A-H][1-8])/i;
    const match = moveDescription.match(moveRegex);
    
    if (!match) {
      return { isValid: false, error: 'Could not parse move description' };
    }
    
    const [_, pieceName, fromSquare, toSquare] = match;
    const pieceType = pieceName.toLowerCase();
    const to = toSquare.toLowerCase();
    const from = fromSquare?.toLowerCase();
    
    // Get all legal moves
    const legalMoves = chess.moves({ verbose: true });
    
    // Map piece names to chess.js notation
    const pieceMap: Record<string, string> = {
      'king': 'k',
      'queen': 'q',
      'rook': 'r',
      'bishop': 'b',
      'knight': 'n',
      'pawn': 'p'
    };
    
    const targetPiece = pieceMap[pieceType];
    if (!targetPiece) {
      return { isValid: false, error: `Unknown piece type: ${pieceName}` };
    }
    
    // Find matching legal moves
    const matchingMoves = legalMoves.filter(move => {
      const pieceMatches = move.piece === targetPiece;
      const toMatches = move.to === to;
      const fromMatches = !from || move.from === from;
      
      return pieceMatches && toMatches && fromMatches;
    });
    
    if (matchingMoves.length === 0) {
      // Try to find what piece is actually on the mentioned square
      const actualPiece = from ? chess.get(from as any) : null;
      
      if (from && !actualPiece) {
        return { 
          isValid: false, 
          error: `No piece on ${fromSquare}. Check the board position.` 
        };
      }
      
      if (from && actualPiece && actualPiece.type !== targetPiece) {
        const actualPieceName = Object.keys(pieceMap).find(key => pieceMap[key] === actualPiece.type);
        return { 
          isValid: false, 
          error: `${fromSquare} has a ${actualPieceName}, not a ${pieceName}` 
        };
      }
      
      // Check if the piece type exists anywhere that can move to target
      const possibleMoves = legalMoves.filter(m => m.piece === targetPiece && m.to === to);
      if (possibleMoves.length > 0) {
        const correctFrom = possibleMoves[0].from.toUpperCase();
        return {
          isValid: false,
          correctedMove: `${pieceName} from ${correctFrom} to ${toSquare}`,
          error: `${pieceName} to ${toSquare} is only possible from ${correctFrom}`
        };
      }
      
      return { 
        isValid: false, 
        error: `${moveDescription} is not a legal move in the current position` 
      };
    }
    
    if (matchingMoves.length === 1) {
      return { isValid: true };
    }
    
    // Multiple pieces can make the move - need clarification
    const possibleFromSquares = matchingMoves.map(m => m.from.toUpperCase()).join(' or ');
    return {
      isValid: false,
      error: `Multiple ${pieceName}s can move to ${toSquare}. Specify: ${possibleFromSquares}`
    };
    
  } catch (error) {
    return { 
      isValid: false, 
      error: `Invalid position or move: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Get a summary of the current board state
 */
export function getBoardSummary(fen: string): {
  turn: 'white' | 'black';
  inCheck: boolean;
  isGameOver: boolean;
  result?: 'checkmate' | 'draw' | 'stalemate';
  legalMovesCount: number;
  pieces: {
    white: Record<string, string[]>;
    black: Record<string, string[]>;
  };
} {
  const chess = new Chess(fen);
  
  // Categorize pieces by type
  const pieces: {
    white: Record<string, string[]>;
    black: Record<string, string[]>;
  } = {
    white: { king: [], queen: [], rook: [], bishop: [], knight: [], pawn: [] },
    black: { king: [], queen: [], rook: [], bishop: [], knight: [], pawn: [] }
  };
  
  const pieceNames: Record<string, string> = {
    'k': 'king',
    'q': 'queen',
    'r': 'rook',
    'b': 'bishop',
    'n': 'knight',
    'p': 'pawn'
  };
  
  // Scan board
  for (let rank = 8; rank >= 1; rank--) {
    for (let file = 0; file < 8; file++) {
      const square = String.fromCharCode(97 + file) + rank;
      const piece = chess.get(square as any);
      if (piece) {
        const pieceName = pieceNames[piece.type];
        const color = piece.color === 'w' ? 'white' : 'black';
        pieces[color][pieceName].push(square.toUpperCase());
      }
    }
  }
  
  let result: 'checkmate' | 'draw' | 'stalemate' | undefined;
  if (chess.isCheckmate()) result = 'checkmate';
  else if (chess.isStalemate()) result = 'stalemate';
  else if (chess.isDraw()) result = 'draw';
  
  return {
    turn: chess.turn() === 'w' ? 'white' : 'black',
    inCheck: chess.isCheck(),
    isGameOver: chess.isGameOver(),
    result,
    legalMovesCount: chess.moves().length,
    pieces
  };
}

/**
 * Parse Chester's response to extract move suggestions
 */
export function extractMoveSuggestions(response: string): string[] {
  const suggestions: string[] = [];
  
  // Common patterns Chester might use
  const patterns = [
    /\b(King|Queen|Rook|Bishop|Knight|Pawn)\s+(?:from\s+[A-H][1-8]\s+)?to\s+[A-H][1-8]\b/gi,
    /\bmove\s+(?:the\s+)?(\w+)\s+to\s+[A-H][1-8]\b/gi,
    /\b([A-H][1-8])\s+to\s+([A-H][1-8])\b/gi
  ];
  
  for (const pattern of patterns) {
    const matches = response.matchAll(pattern);
    for (const match of matches) {
      suggestions.push(match[0]);
    }
  }
  
  return [...new Set(suggestions)]; // Remove duplicates
}