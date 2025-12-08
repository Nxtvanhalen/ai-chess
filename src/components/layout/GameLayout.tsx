'use client';

import { ReactNode } from 'react';
import { useDeviceDetection } from '@/hooks/useKeyboardManager';
import { PWAManager } from '@/components/pwa';

interface GameLayoutProps {
  chessBoard: ReactNode;
  chat: ReactNode;
  controls?: ReactNode;
}

export default function GameLayout({ chessBoard, chat, controls }: GameLayoutProps) {
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
      {/* PWA Installation Management */}
      <PWAManager
        showFloatingButton={false}
        showInstallBanner={true}
        showWelcomeMessage={true}
        floatingButtonPosition={isMobile ? 'bottom-left' : 'bottom-right'}
        bannerPosition={isMobile ? 'bottom' : 'top-right'}
      />

      {/* Mobile Portrait Layout: CSS-controlled fixed positioning */}
      {isMobile && !isLandscape && (
        <>
          {/* Chess Board Section - Pure CSS positioning */}
          <div className="chess-board-section">
            <div className="chess-board-container">
              {chessBoard}
            </div>
          </div>

          {/* Controls Section - Between board and chat */}
          {controls && (
            <div className="controls-section">
              {controls}
            </div>
          )}

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

      {/* Mobile Landscape Layout: Focused Board Only */}
      {isMobile && isLandscape && (
        <div className="layout-landscape">
          <div className="board-landscape-wrapper w-full h-full border-none shadow-none">
            <div className="board-landscape w-full h-full flex items-center justify-center">
              {chessBoard}
            </div>
            {/* Controls HIDDEN in landscape as requested to prevent overlap */}
          </div>
          <div className="hidden">
            {chat}
          </div>
        </div>
      )}

      {/* Desktop Layout: Side by side */}
      {!isMobile && (
        <div className="layout-desktop">
          <div className="board-desktop-wrapper">
            <div className="board-desktop">
              {chessBoard}
            </div>
            {controls && (
              <div className="controls-desktop">
                {controls}
                <div className="text-xs text-slate-500 mt-4 text-center font-mono select-none opacity-50">System v2.6 (Focus Mode)</div>
              </div>
            )}
          </div>
          <div className="chat-desktop">
            {chat}
          </div>
        </div>
      )}
    </div>
  );
}