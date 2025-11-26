import React from 'react';
import type { CustomPieceFnArgs } from 'react-chessboard/dist/chessboard/types';

// Chess.com 3D pieces - dimensional and ornate!
const PIECE_URLS = {
  // White pieces - 3D style
  wP: 'https://images.chesscomfiles.com/chess-themes/pieces/3d_chesskid/150/wp.png',
  wN: 'https://images.chesscomfiles.com/chess-themes/pieces/3d_chesskid/150/wn.png',
  wB: 'https://images.chesscomfiles.com/chess-themes/pieces/3d_chesskid/150/wb.png',
  wR: 'https://images.chesscomfiles.com/chess-themes/pieces/3d_chesskid/150/wr.png',
  wQ: 'https://images.chesscomfiles.com/chess-themes/pieces/3d_chesskid/150/wq.png',
  wK: 'https://images.chesscomfiles.com/chess-themes/pieces/3d_chesskid/150/wk.png',

  // Black pieces - 3D style
  bP: 'https://images.chesscomfiles.com/chess-themes/pieces/3d_chesskid/150/bp.png',
  bN: 'https://images.chesscomfiles.com/chess-themes/pieces/3d_chesskid/150/bn.png',
  bB: 'https://images.chesscomfiles.com/chess-themes/pieces/3d_chesskid/150/bb.png',
  bR: 'https://images.chesscomfiles.com/chess-themes/pieces/3d_chesskid/150/br.png',
  bQ: 'https://images.chesscomfiles.com/chess-themes/pieces/3d_chesskid/150/bq.png',
  bK: 'https://images.chesscomfiles.com/chess-themes/pieces/3d_chesskid/150/bk.png',
};

// Create custom piece renderer with rotation and color adjustments
// All pieces: white faces up (12 o'clock), black faces down (6 o'clock)
// White pieces are chrome/metallic silver, black pieces are dark purple
const createPieceRenderer = (pieceUrl: string, isWhite: boolean) => {
  return ({ squareWidth, isDragging }: CustomPieceFnArgs) => (
    <img
      src={pieceUrl}
      alt="chess piece"
      style={{
        width: squareWidth,
        height: squareWidth,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'pointer',
        transform: isWhite ? 'rotate(180deg)' : 'rotate(0deg)',
        filter: isWhite
          ? 'brightness(1.1) contrast(1.3) saturate(0.5) grayscale(0.3)' // Chrome/metallic silver
          : 'brightness(0.6) hue-rotate(270deg) saturate(1.5) contrast(1.2)', // Dark purple pieces
      }}
    />
  );
};

// Export custom pieces configuration
export const customPieces = {
  wP: createPieceRenderer(PIECE_URLS.wP, true),
  wN: createPieceRenderer(PIECE_URLS.wN, true),
  wB: createPieceRenderer(PIECE_URLS.wB, true),
  wR: createPieceRenderer(PIECE_URLS.wR, true),
  wQ: createPieceRenderer(PIECE_URLS.wQ, true),
  wK: createPieceRenderer(PIECE_URLS.wK, true),
  bP: createPieceRenderer(PIECE_URLS.bP, false),
  bN: createPieceRenderer(PIECE_URLS.bN, false),
  bB: createPieceRenderer(PIECE_URLS.bB, false),
  bR: createPieceRenderer(PIECE_URLS.bR, false),
  bQ: createPieceRenderer(PIECE_URLS.bQ, false),
  bK: createPieceRenderer(PIECE_URLS.bK, false),
};

// Alternative ornate piece sets (comment/uncomment to switch)
export const ORNATE_STYLES = {
  standard: PIECE_URLS,
  // Add more styles here as we find them
};
