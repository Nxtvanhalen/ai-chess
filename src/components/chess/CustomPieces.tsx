import React from 'react';
import type { CustomPieceFnArgs } from 'react-chessboard/dist/chessboard/types';

// Chess.com 3D pieces - dimensional and ornate!
const PIECE_URLS = {
  // White pieces - 3D style
  wP: '/PAWN.svg',
  wN: '/Gemini_Generated_Image_40n0va40n0va40n0-removebg-preview (2).svg',
  wB: '/BishopNoBG.svg',
  wR: '/CastleNOBG.svg',
  wQ: '/QUEEN.svg',
  wK: '/King.svg',

  // Black pieces - 3D style
  bP: '/PAWN.svg',
  bN: '/Gemini_Generated_Image_40n0va40n0va40n0-removebg-preview (2).svg',
  bB: '/BishopNoBG.svg',
  bR: '/CastleNOBG.svg',
  bQ: '/QUEEN.svg',
  bK: '/King.svg',
};

// Create custom piece renderer with rotation and color adjustments
// All pieces: white faces up (12 o'clock), black faces down (6 o'clock)
// White pieces are chrome/metallic silver, black pieces are dark purple
const createPieceRenderer = (pieceUrl: string, isWhite: boolean, scale: number = 1, noRotate: boolean = false) => {
  return ({ squareWidth, isDragging }: CustomPieceFnArgs) => {
    const rotation = (isWhite && !noRotate) ? 'rotate(180deg)' : 'rotate(0deg)';
    const scaleTransform = scale !== 1 ? ` scale(${scale})` : '';
    return (
      <img
        src={pieceUrl}
        alt="chess piece"
        style={{
          width: squareWidth,
          height: squareWidth,
          opacity: isDragging ? 0.5 : 1,
          cursor: 'pointer',
          transform: `${rotation}${scaleTransform}`,
          filter: isWhite
            ? 'brightness(1.1) contrast(1.3) saturate(0.5) grayscale(0.3)' // Chrome/metallic silver
            : 'brightness(0.6) hue-rotate(270deg) saturate(1.5) contrast(1.2)', // Dark purple pieces
        }}
      />
    );
  };
};

// Export custom pieces configuration
export const customPieces = {
  wP: createPieceRenderer(PIECE_URLS.wP, true, 2, true), // 2x bigger, no rotation
  wN: createPieceRenderer(PIECE_URLS.wN, true, 2, true), // 2x bigger, no rotation
  wB: createPieceRenderer(PIECE_URLS.wB, true, 2, true), // 2x bigger, no rotation
  wR: createPieceRenderer(PIECE_URLS.wR, true, 2, true), // 2x bigger, no rotation
  wQ: createPieceRenderer(PIECE_URLS.wQ, true, 2, true), // 2x bigger, no rotation
  wK: createPieceRenderer(PIECE_URLS.wK, true, 2, true), // 2x bigger, no rotation
  bP: createPieceRenderer(PIECE_URLS.bP, false, 2), // 2x bigger
  bN: createPieceRenderer(PIECE_URLS.bN, false, 2), // 2x bigger
  bB: createPieceRenderer(PIECE_URLS.bB, false, 2), // 2x bigger
  bR: createPieceRenderer(PIECE_URLS.bR, false, 2), // 2x bigger
  bQ: createPieceRenderer(PIECE_URLS.bQ, false, 2), // 2x bigger
  bK: createPieceRenderer(PIECE_URLS.bK, false, 2), // 2x bigger
};

// Alternative ornate piece sets (comment/uncomment to switch)
export const ORNATE_STYLES = {
  standard: PIECE_URLS,
  // Add more styles here as we find them
};
