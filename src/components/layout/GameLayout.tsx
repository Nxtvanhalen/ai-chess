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
    <div className="h-screen w-screen overflow-auto lg:overflow-hidden relative p-0 m-0">
      {/* Mobile Portrait Layout: Stacked with smooth keyboard handling */}
      {isMobile && !isLandscape && (
        <div className={`flex flex-col h-screen layout-container ${isKeyboardOpen ? 'mobile-keyboard-active' : ''}`}>
          <div 
            className={`chess-section flex-shrink-0 shadow-2xl relative orientation-transition`} 
            style={{ 
              height: 'auto', 
              maxHeight: isKeyboardOpen ? '45vh' : '70vh',
              transform: isKeyboardOpen ? 'scale(0.85)' : 'scale(1)',
              transformOrigin: 'center top',
              willChange: 'transform, max-height',
            }}>
            {chessBoard}
          </div>
          <div 
            className={`chat-section flex-1 shadow-2xl backdrop-blur-sm overflow-visible orientation-transition border-t border-purple-400/30 mt-28`}
            style={{
              marginBottom: isKeyboardOpen ? `${Math.max(keyboardHeight - 100, 0)}px` : '0px',
              willChange: 'margin-bottom',
            }}>
            {chat}
          </div>
        </div>
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