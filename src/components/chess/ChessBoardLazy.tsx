'use client';

import { lazy, Suspense } from 'react';
import { Move, Square } from 'chess.js';
import { BoardTheme } from '@/lib/chess/boardThemes';

// Lazy load the heavy ChessBoard component
const ChessBoardComponent = lazy(() => import('./ChessBoard'));

interface ChessBoardProps {
  onMove: (move: Move) => void;
  position?: string;
  orientation?: 'white' | 'black';
  interactive?: boolean;
  onCheckmate?: (winner: 'white' | 'black') => void;
  theme?: BoardTheme;
}

// Loading fallback with similar dimensions to prevent layout shift
function ChessBoardLoading() {
  return (
    <div className="flex items-center justify-center p-1 lg:p-6 pt-2 lg:pt-6">
      <div 
        className="bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 rounded-2xl flex items-center justify-center"
        style={{ width: 400, height: 400 }}
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 animate-pulse" />
          <p className="text-slate-400 text-sm font-medium">Loading Chess Board...</p>
        </div>
      </div>
    </div>
  );
}

export default function ChessBoardLazy(props: ChessBoardProps) {
  return (
    <Suspense fallback={<ChessBoardLoading />}>
      <ChessBoardComponent {...props} />
    </Suspense>
  );
}