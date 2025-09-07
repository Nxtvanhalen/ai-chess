'use client';

import { ReactNode, useState, useEffect } from 'react';

interface GameLayoutProps {
  chessBoard: ReactNode;
  chat: ReactNode;
}

export default function GameLayout({ chessBoard, chat }: GameLayoutProps) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Orientation and device detection
  useEffect(() => {
    const updateLayout = () => {
      const mobile = window.innerWidth < 1024;
      const landscape = window.innerWidth > window.innerHeight;
      
      setIsMobile(mobile);
      setIsLandscape(landscape);
    };

    // Initial check
    updateLayout();

    // Listen for resize and orientation changes
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', () => {
      // Delay to allow orientation change to complete
      setTimeout(updateLayout, 100);
    });

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []);

  useEffect(() => {
    const handleKeyboardOpen = (event: Event) => {
      setIsKeyboardOpen(true);
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.height) {
        setKeyboardHeight(customEvent.detail.height);
      }
    };
    
    const handleKeyboardClose = () => {
      setIsKeyboardOpen(false);
      setKeyboardHeight(0);
    };

    // Listen for enhanced custom events from ChatInput
    window.addEventListener('keyboard-open', handleKeyboardOpen);
    window.addEventListener('keyboard-close', handleKeyboardClose);

    return () => {
      window.removeEventListener('keyboard-open', handleKeyboardOpen);
      window.removeEventListener('keyboard-close', handleKeyboardClose);
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden relative p-0 m-0" style={{ height: '100dvh' }}>
      {/* Mobile Portrait Layout: Stacked with smooth keyboard handling */}
      {isMobile && !isLandscape && (
        <div className="flex flex-col h-full w-full">
          {/* Chess Board Section - Fixed height, positioned at top */}
          <div 
            className="chess-section shadow-2xl relative orientation-transition"
            style={{ 
              height: isKeyboardOpen ? '35vh' : '50vh',
              minHeight: '280px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: '1rem'
            }}>
            <div style={{ 
              transform: isKeyboardOpen ? 'scale(0.85)' : 'scale(1)',
              transformOrigin: 'center top',
              transition: 'transform 0.3s ease-out'
            }}>
              {chessBoard}
            </div>
          </div>
          
          {/* Chat Section - Takes remaining space, adjusts for keyboard */}
          <div 
            className="chat-section flex-1 shadow-2xl backdrop-blur-sm orientation-transition border-t border-purple-400/30"
            style={{
              minHeight: '200px',
              maxHeight: isKeyboardOpen ? `calc(100vh - ${keyboardHeight + 200}px)` : 'none',
              overflow: 'hidden',
              paddingBottom: isKeyboardOpen ? '1rem' : '0rem',
              willChange: 'max-height, padding-bottom'
            }}>
            {chat}
          </div>
        </div>
      )}

      {/* Keyboard dismiss overlay */}
      {isMobile && !isLandscape && isKeyboardOpen && (
        <div 
          className="fixed inset-0 z-40"
          style={{ 
            background: 'transparent',
            pointerEvents: keyboardHeight > 0 ? 'auto' : 'none'
          }}
          onClick={() => {
            // Blur any focused input to dismiss keyboard
            if (document.activeElement && document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
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