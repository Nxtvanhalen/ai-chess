'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { boardThemes, BoardTheme } from '@/lib/chess/boardThemes';

interface ThemeSelectorProps {
  currentTheme: BoardTheme;
  onThemeChange: (theme: BoardTheme) => void;
}

export default function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 rounded-lg transition-all duration-200 backdrop-blur-sm"
        title="Change board theme"
      >
        {/* Mini preview of current theme */}
        <div className="w-6 h-6 rounded overflow-hidden grid grid-cols-2 grid-rows-2 shadow-inner">
          <div style={{ background: currentTheme.lightSquare.background }} />
          <div style={{ background: currentTheme.darkSquare.background }} />
          <div style={{ background: currentTheme.darkSquare.background }} />
          <div style={{ background: currentTheme.lightSquare.background }} />
        </div>
        <span className="text-xs text-slate-300 hidden sm:inline">{currentTheme.name}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Theme Grid - Opens upward, centered on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-24 left-4 right-4 mx-auto z-[100] p-3 bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-md max-w-[280px] max-h-[50vh] overflow-y-auto"
            >
              <div className="text-xs text-slate-400 mb-2 px-1">Board Theme</div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {boardThemes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onThemeChange(theme);
                      setIsOpen(false);
                    }}
                    className={`group relative p-2 rounded-lg transition-all duration-200 ${
                      currentTheme.id === theme.id
                        ? 'bg-purple-600/30 ring-2 ring-purple-500'
                        : 'hover:bg-slate-800/80'
                    }`}
                  >
                    {/* Theme Preview */}
                    <div
                      className="w-full aspect-square rounded-md overflow-hidden grid grid-cols-4 grid-rows-4 shadow-lg mb-1"
                      style={{
                        border: theme.boardStyle.border,
                        borderRadius: theme.boardStyle.borderRadius,
                      }}
                    >
                      {Array.from({ length: 16 }).map((_, i) => {
                        const row = Math.floor(i / 4);
                        const col = i % 4;
                        const isLight = (row + col) % 2 === 0;
                        return (
                          <div
                            key={i}
                            style={{
                              background: isLight
                                ? theme.lightSquare.background
                                : theme.darkSquare.background,
                              boxShadow: isLight
                                ? theme.lightSquare.boxShadow
                                : theme.darkSquare.boxShadow,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Theme Name */}
                    <div className={`text-xs text-center truncate ${
                      currentTheme.id === theme.id
                        ? 'text-purple-300 font-medium'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}>
                      {theme.name}
                    </div>

                    {/* Selected Indicator */}
                    {currentTheme.id === theme.id && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
