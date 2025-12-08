import React from 'react';
import type { CustomPieceFnArgs } from 'react-chessboard/dist/chessboard/types';
import { Pawn } from './pieces/Pawn';
import { Knight } from './pieces/Knight';
import { Bishop } from './pieces/Bishop';
import { Rook } from './pieces/Rook';
import { Queen } from './pieces/Queen';
import { King } from './pieces/King';

// Define Piece Palettes for "God Mode" Customization
const PALETTES = {
  white: {
    // Chrome/Silver Aesthetic
    primary: '#cbd5e1',    // Slate-300 (Darker Silver for better solidity)
    secondary: '#f8fafc',  // Slate-50
    accent: '#64748b',     // Slate-500 (Stronger Grey to define 3D shading)
  },
  black: {
    // Obsidian/Void Aesthetic (matching the board theme)
    primary: '#0f172a',    // Slate-900 (Deep Navy/Black)
    secondary: '#581c87',  // Purple-900 (Dark Purple)
    accent: '#a855f7',     // Purple-500 (Glowing Purple Accent)
  }
};

const PIECE_COMPONENTS = {
  p: Pawn,
  n: Knight,
  b: Bishop,
  r: Rook,
  q: Queen,
  k: King,
};

const createPieceRenderer = (PieceComponent: any, isWhite: boolean) => {
  return ({ squareWidth, isDragging }: CustomPieceFnArgs) => {
    const palette = isWhite ? PALETTES.white : PALETTES.black;
    const rotation = isWhite ? 'rotate(180deg)' : 'rotate(0deg)'; // Pieces face each other? No, standard is usually one way.
    // Wait, previous code had: const rotation = (isWhite && !noRotate) ? 'rotate(180deg)' : 'rotate(0deg)';
    // Usually white is at bottom, pieces face up.
    // In many chess sets (images), they face forward. 
    // SVG vectors usually face "up" or "forward".

    // Let's stick to standard 0 rotation unless we see they are upside down.
    // Previous code rotated White pieces 180deg but 'noRotate' was true for all white pieces except... none?
    // "wP: createPieceRenderer(PIECE_URLS.wP, true, 2, true)" -> noRotate=true
    // So actually they were NOT rotated.

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
          // Hover glow effect could be added here
        }}
      >
        <PieceComponent
          primary={palette.primary}
          secondary={palette.secondary}
          accent={palette.accent}
          stroke={palette.primary} // Weld with body color
          strokeWidth={isWhite ? '0.5' : '0.2'} // Thicker weld for white to hide cracks, thin for black to preserve detail
          style={{
            width: '100%',
            height: '100%',
            transform: 'scale(2.0)', // Maximized size
            transformOrigin: 'center', // Ensure they scale from center
            filter: isWhite
              ? 'brightness(1.1) contrast(1.1) drop-shadow(0 2px 3px rgba(0,0,0,0.3))' // Crisp Original with slight polish
              : 'brightness(0.65) sepia(0.4) hue-rotate(210deg) saturate(1.4) contrast(1.2) drop-shadow(0 4px 6px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(168, 85, 247, 0.3))', // Dark Obsidian with clearer Violet tint
          }}
        />
      </div>
    );
  };
};

export const customPieces = {
  wP: createPieceRenderer(Pawn, true),
  wN: createPieceRenderer(Knight, true),
  wB: createPieceRenderer(Bishop, true),
  wR: createPieceRenderer(Rook, true),
  wQ: createPieceRenderer(Queen, true),
  wK: createPieceRenderer(King, true),
  bP: createPieceRenderer(Pawn, false),
  bN: createPieceRenderer(Knight, false),
  bB: createPieceRenderer(Bishop, false),
  bR: createPieceRenderer(Rook, false),
  bQ: createPieceRenderer(Queen, false),
  bK: createPieceRenderer(King, false),
};
