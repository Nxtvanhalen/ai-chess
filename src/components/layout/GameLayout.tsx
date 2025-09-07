'use client';

import { ReactNode } from 'react';
import { useDeviceDetection } from '@/hooks/useKeyboardManager';

interface GameLayoutProps {
  chessBoard: ReactNode;
  chat: ReactNode;
}

export default function GameLayout({ chessBoard, chat }: GameLayoutProps) {
  const { isMobile, isLandscape, dismissKeyboard } = useDeviceDetection();

  // Handle keyboard dismissal via touch outside (mobile portrait only)
  const handleDismissTouch = (e: React.TouchEvent | React.MouseEvent) => {
    if (isMobile && !isLandscape) {
      e.preventDefault();
      e.stopPropagation();
      dismissKeyboard();
    }
  };

  return (
    <div className="game-layout">
      {/* Mobile Portrait Layout: CSS-controlled fixed positioning */}
      {isMobile && !isLandscape && (
        <>
          {/* Chess Board Section - Pure CSS positioning */}
          <div className="chess-board-section">
            <div className="chess-board-container">
              {chessBoard}
            </div>
          </div>
          
          {/* Chat Section - CSS controlled positioning above input */}
          <div className="chat-section">
            {chat}
          </div>

          {/* Keyboard dismiss overlay - only visible when input is focused */}
          <div 
            className="keyboard-dismiss-overlay"
            onClick={handleDismissTouch}
            onTouchStart={handleDismissTouch}
          />
        </>
      )}

      {/* Mobile Landscape Layout: Side by side */}
      {isMobile && isLandscape && (
        <div className="layout-landscape">
          <div className="board-landscape">
            {chessBoard}
          </div>
          <div className="chat-landscape">
            {chat}
          </div>
        </div>
      )}

      {/* Desktop Layout: Side by side */}
      {!isMobile && (
        <div className="layout-desktop">
          <div className="board-desktop">
            {chessBoard}
          </div>
          <div className="chat-desktop">
            {chat}
          </div>
        </div>
      )}
    </div>
  );
}