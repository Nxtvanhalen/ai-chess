'use client';

import { ReactNode } from 'react';
import { useKeyboardManager } from '@/hooks/useKeyboardManager';

interface GameLayoutProps {
  chessBoard: ReactNode;
  chat: ReactNode;
}

export default function GameLayout({ chessBoard, chat }: GameLayoutProps) {
  const {
    keyboardState,
    isMobile,
    isLandscape,
    layoutDimensions,
    dismissKeyboard,
    isKeyboardSupported
  } = useKeyboardManager({ verbose: true });

  // Extract keyboard state for cleaner code
  const { isOpen: isKeyboardOpen, height: keyboardHeight } = keyboardState;

  // Handle keyboard dismissal via touch outside
  const handleDismissTouch = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isKeyboardSupported && isKeyboardOpen) {
      dismissKeyboard();
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden relative p-0 m-0" 
         style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      {/* Mobile Portrait Layout: Fixed positioning system */}
      {isMobile && !isLandscape && (
        <>
          {/* Chess Board Section - Fixed top position */}
          <div 
            className={`fixed top-0 left-0 right-0 z-20 shadow-2xl orientation-transition ${
              isKeyboardOpen ? 'h-[30vh]' : 'h-[50vh]'
            }`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: '0.5rem',
              transition: `height ${keyboardState.transitionDuration}ms ease-out`,
              backgroundColor: 'transparent'
            }}>
            <div style={{ 
              transform: isKeyboardOpen ? 'scale(0.75)' : 'scale(1)',
              transformOrigin: 'center top',
              transition: `transform ${keyboardState.transitionDuration}ms ease-out`,
              willChange: 'transform'
            }}>
              {chessBoard}
            </div>
          </div>
          
          {/* Chat Section - Positioned to fill space above keyboard/input */}
          <div 
            className={`absolute left-0 right-0 z-10 overflow-hidden ${
              isKeyboardOpen ? 'top-[30vh]' : 'top-[50vh]'
            }`}
            style={{
              transition: `top ${keyboardState.transitionDuration}ms ease-out`,
              backgroundColor: 'rgb(2, 6, 23)', // Solid dark background to prevent gap
              bottom: 0,
              margin: 0,
              padding: 0
            }}>
            {chat}
          </div>
        </>
      )}

      {/* Enhanced keyboard dismiss overlay */}
      {isKeyboardSupported && isKeyboardOpen && (
        <div 
          className="fixed inset-0 z-15"
          style={{ 
            background: 'transparent',
            pointerEvents: 'auto',
            top: 0,
            bottom: '5rem', // Don't cover input area - adjusted for no gap
            transition: `bottom ${keyboardState.transitionDuration}ms ease-out`
          }}
          onClick={handleDismissTouch}
          onTouchStart={handleDismissTouch}
        />
      )}

      {/* Mobile Landscape Layout: Side by side like desktop */}
      {isMobile && isLandscape && (
        <div className="flex h-full layout-container">
          <div className="flex-shrink-0 w-[55%] border-r border-purple-400/30 shadow-2xl orientation-transition">
            {chessBoard}
          </div>
          <div className="flex-1 min-w-0 shadow-2xl backdrop-blur-sm orientation-transition">
            {chat}
          </div>
        </div>
      )}

      {/* Desktop Layout: Side by side */}
      {!isMobile && (
        <div className="flex h-full">
          <div className="flex-shrink-0 w-[55%] border-r border-purple-400/30 shadow-2xl">
            {chessBoard}
          </div>
          <div className="flex-1 min-w-0 shadow-2xl backdrop-blur-sm">
            {chat}
          </div>
        </div>
      )}
    </div>
  );
}