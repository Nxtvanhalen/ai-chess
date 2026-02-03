export interface PieceName {
  title: string;
  subtitle?: string;
}

export const pieceNames: Record<string, PieceName> = {
  // White pieces
  wK: { title: 'King' },
  wQ: { title: 'Queen' },
  wR1: { title: 'Rook' },
  wR2: { title: 'Rook' },
  wB1: { title: 'Bishop' },
  wB2: { title: 'Bishop' },
  wN1: { title: 'Knight' },
  wN2: { title: 'Knight' },
  wP1: { title: 'Pawn' },
  wP2: { title: 'Pawn' },
  wP3: { title: 'Pawn' },
  wP4: { title: 'Pawn' },
  wP5: { title: 'Pawn' },
  wP6: { title: 'Pawn' },
  wP7: { title: 'Pawn' },
  wP8: { title: 'Pawn' },

  // Black pieces
  bK: { title: 'King' },
  bQ: { title: 'Queen' },
  bR1: { title: 'Rook' },
  bR2: { title: 'Rook' },
  bB1: { title: 'Bishop' },
  bB2: { title: 'Bishop' },
  bN1: { title: 'Knight' },
  bN2: { title: 'Knight' },
  bP1: { title: 'Pawn' },
  bP2: { title: 'Pawn' },
  bP3: { title: 'Pawn' },
  bP4: { title: 'Pawn' },
  bP5: { title: 'Pawn' },
  bP6: { title: 'Pawn' },
  bP7: { title: 'Pawn' },
  bP8: { title: 'Pawn' },
};

// Helper function to get piece ID based on its type and starting position
export function getPieceId(piece: string, square: string): string {
  const color = piece[0];
  const type = piece[1];

  if (type === 'K' || type === 'Q') {
    return piece;
  }

  // For Rooks, Bishops, Knights - determine based on starting position
  if (type === 'R' || type === 'B' || type === 'N') {
    // For now, we'll use a simple left/right distinction
    // In a real implementation, we'd track pieces from their starting positions
    const file = square[0];
    if (file <= 'd') {
      return `${color}${type}1`;
    } else {
      return `${color}${type}2`;
    }
  }

  // For pawns - we'll name them based on their current file
  // This means names might change as pawns capture, but it's simpler
  if (type === 'P') {
    const file = square[0];
    const fileIndex = file.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    return `${color}${type}${fileIndex}`;
  }

  return piece;
}

// Get name for a piece at a given square
export function getPieceName(piece: string, square: string): PieceName {
  const pieceId = getPieceId(piece, square);
  return pieceNames[pieceId] || { title: 'Unknown', subtitle: 'Mysterious Piece' };
}
