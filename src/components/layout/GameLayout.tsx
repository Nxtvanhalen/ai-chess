'use client';

import { ReactNode, useState, useEffect } from 'react';

interface GameLayoutProps {
  chessBoard: ReactNode;
  chat: ReactNode;
}

export default function GameLayout({ chessBoard, chat }: GameLayoutProps) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleKeyboardOpen = () => setIsKeyboardOpen(true);
    const handleKeyboardClose = () => setIsKeyboardOpen(false);

    // Listen for custom events from ChatInput
    window.addEventListener('keyboard-open', handleKeyboardOpen);
    window.addEventListener('keyboard-close', handleKeyboardClose);

    return () => {
      window.removeEventListener('keyboard-open', handleKeyboardOpen);
      window.removeEventListener('keyboard-close', handleKeyboardClose);
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-auto lg:overflow-hidden relative">
      {/* Mobile Layout: Stacked with keyboard handling */}
      <div className={`flex flex-col h-screen lg:hidden ${isKeyboardOpen ? 'mobile-keyboard-active' : ''}`}>
        <div className={`chess-section flex-shrink-0 shadow-2xl relative transition-all duration-300 ease-in-out`} style={{ height: 'auto', maxHeight: isKeyboardOpen ? '45vh' : '70vh' }}>
          {chessBoard}
        </div>
        <div className={`chat-section flex-1 shadow-2xl backdrop-blur-sm overflow-visible transition-all duration-300 ease-in-out border-t border-purple-400/30 mt-28 lg:mt-0`}>
          {chat}
        </div>
      </div>

      {/* Desktop Layout: Side by side - no changes needed */}
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