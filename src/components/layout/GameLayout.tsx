'use client';

import { ReactNode } from 'react';

interface GameLayoutProps {
  chessBoard: ReactNode;
  chat: ReactNode;
}

export default function GameLayout({ chessBoard, chat }: GameLayoutProps) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      {/* Mobile Layout: Stacked */}
      <div className="flex flex-col h-full lg:hidden">
        <div className="flex-shrink-0 shadow-2xl relative" style={{ height: '60vh' }}>
          {chessBoard}
        </div>
        <div className="flex-1 min-h-0 border-t border-purple-400/30 shadow-2xl backdrop-blur-sm overflow-hidden" style={{ height: '40vh' }}>
          {chat}
        </div>
      </div>

      {/* Desktop Layout: Side by side */}
      <div className="hidden lg:flex h-full">
        <div className="flex-shrink-0 w-[55%] border-r border-purple-400/30 shadow-2xl">
          {chessBoard}
        </div>
        <div className="flex-1 min-w-0 shadow-2xl backdrop-blur-sm">
          {chat}
        </div>
      </div>
    </div>
  );
}