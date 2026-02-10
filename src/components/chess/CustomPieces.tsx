import type { CustomPieceFnArgs } from 'react-chessboard/dist/chessboard/types';
import { Bishop } from './pieces/Bishop';
import { King } from './pieces/King';
import { Knight } from './pieces/Knight';
import { Pawn } from './pieces/Pawn';
import { Queen } from './pieces/Queen';
import { Rook } from './pieces/Rook';

// Define Piece Palettes for "God Mode" Customization
const PALETTES = {
  white: {
    // Chrome/Silver Aesthetic
    primary: '#cbd5e1', // Slate-300 (Darker Silver for better solidity)
    secondary: '#f8fafc', // Slate-50
    accent: '#64748b', // Slate-500 (Stronger Grey to define 3D shading)
  },
  black: {
    // Obsidian/Void Aesthetic (matching the board theme)
    primary: '#0f172a', // Slate-900 (Deep Navy/Black)
    secondary: '#581c87', // Purple-900 (Dark Purple)
    accent: '#a855f7', // Purple-500 (Glowing Purple Accent)
  },
};

const _PIECE_COMPONENTS = {
  p: Pawn,
  n: Knight,
  b: Bishop,
  r: Rook,
  q: Queen,
  k: King,
};

const createPieceRenderer = (PieceComponent: React.ComponentType<Record<string, unknown>>, isWhite: boolean, pieceType: string) => {
  return ({ squareWidth, isDragging }: CustomPieceFnArgs) => {
    const palette = isWhite ? PALETTES.white : PALETTES.black;
    const size = pieceType === 'p' ? '200%' : '180%'; // Pawns slightly larger (200%) vs others (180%)

    return (
      <div
        style={{
          width: squareWidth,
          height: squareWidth,
          opacity: isDragging ? 0.5 : 1,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
        className="piece-pulse"
      >
        <PieceComponent
          primary={palette.primary}
          secondary={palette.secondary}
          accent={palette.accent}
          stroke={palette.primary}
          strokeWidth={isWhite ? '0.5' : '0.2'}
          style={{
            width: size,
            height: size,
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            willChange: 'transform',
            filter: isWhite
              ? 'brightness(1.1) contrast(1.1) drop-shadow(0 2px 3px rgba(0,0,0,0.3))'
              : 'brightness(0.65) sepia(0.4) hue-rotate(210deg) saturate(1.4) contrast(1.2) drop-shadow(0 4px 6px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(168, 85, 247, 0.3))',
          }}
        />
      </div>
    );
  };
};

export const customPieces = {
  wP: createPieceRenderer(Pawn, true, 'p'),
  wN: createPieceRenderer(Knight, true, 'n'),
  wB: createPieceRenderer(Bishop, true, 'b'),
  wR: createPieceRenderer(Rook, true, 'r'),
  wQ: createPieceRenderer(Queen, true, 'q'),
  wK: createPieceRenderer(King, true, 'k'),
  bP: createPieceRenderer(Pawn, false, 'p'),
  bN: createPieceRenderer(Knight, false, 'n'),
  bB: createPieceRenderer(Bishop, false, 'b'),
  bR: createPieceRenderer(Rook, false, 'r'),
  bQ: createPieceRenderer(Queen, false, 'q'),
  bK: createPieceRenderer(King, false, 'k'),
};
