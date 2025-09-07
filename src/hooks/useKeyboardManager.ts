'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface KeyboardState {
  isOpen: boolean;
  height: number;
  availableHeight: number;
  transitionDuration: number;
}

export interface LayoutDimensions {
  boardHeight: number;
  chatHeight: number;
  inputHeight: number;
  boardPercent: number;
  chatPercent: number;
  inputPercent: number;
}

export interface KeyboardManagerOptions {
  debounceMs?: number;
  transitionMs?: number;
  minKeyboardHeight?: number;
  verbose?: boolean;
}

const DEFAULT_OPTIONS: Required<KeyboardManagerOptions> = {
  debounceMs: 50,
  transitionMs: 300,
  minKeyboardHeight: 150,
  verbose: false
};

export function useKeyboardManager(options: KeyboardManagerOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isOpen: false,
    height: 0,
    availableHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    transitionDuration: config.transitionMs
  });
  
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  
  // Refs for cleanup and debouncing
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialViewportHeight = useRef<number>(0);
  const lastKnownHeight = useRef<number>(0);
  
  // Enhanced viewport detection with CSS custom properties
  const detectViewportChange = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const isMobileDevice = window.innerWidth < 1024;
    const isLandscapeMode = window.innerWidth > window.innerHeight;
    
    setIsMobile(isMobileDevice);
    setIsLandscape(isLandscapeMode);
    
    // Set CSS custom property for viewport height (proven pattern)
    if (isMobileDevice) {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    if (!isMobileDevice) {
      // Desktop - ensure keyboard state is reset
      setKeyboardState(prev => ({
        ...prev,
        isOpen: false,
        height: 0,
        availableHeight: window.innerHeight
      }));
      return;
    }
    
    // Simplified keyboard detection (proven 150px threshold pattern)
    const initialHeight = initialViewportHeight.current;
    const currentHeight = window.innerHeight;
    const heightDifference = initialHeight - currentHeight;
    
    // Proven threshold: 150px indicates keyboard is open
    const isKeyboardOpen = heightDifference > 150;
    
    // When keyboard opens, reduce by 100px to keep input visible above keyboard
    const keyboardHeight = isKeyboardOpen ? Math.max(0, heightDifference - 100) : 0;
    
    if (config.verbose) {
      console.log('KeyboardManager - Simplified Detection:', {
        initialHeight,
        currentHeight,
        heightDifference,
        threshold: '150px',
        isKeyboardOpen,
        keyboardHeight,
        isMobile: isMobileDevice,
        isLandscape: isLandscapeMode
      });
    }
    
    // Update keyboard state with simplified values
    setKeyboardState(prev => ({
      ...prev,
      isOpen: isKeyboardOpen,
      height: keyboardHeight,
      availableHeight: currentHeight,
    }));
    
    // Dispatch custom events for other components
    if (isKeyboardOpen && !lastKnownHeight.current) {
      window.dispatchEvent(new CustomEvent('keyboard-open', { 
        detail: { 
          height: keyboardHeight,
          availableHeight: currentHeight
        } 
      }));
    } else if (!isKeyboardOpen && lastKnownHeight.current) {
      window.dispatchEvent(new Event('keyboard-close'));
    }
    
    lastKnownHeight.current = isKeyboardOpen ? keyboardHeight : 0;
    
  }, [config.verbose]);
  
  // Debounced viewport change handler
  const debouncedDetectViewportChange = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      detectViewportChange();
    }, config.debounceMs);
  }, [detectViewportChange, config.debounceMs]);
  
  // Dynamic height calculation algorithm
  const calculateLayoutDimensions = useCallback((): LayoutDimensions => {
    if (!isMobile) {
      // Desktop layout - 55% board, 45% chat
      const height = typeof window !== 'undefined' ? window.innerHeight : 800;
      return {
        boardHeight: height * 0.55,
        chatHeight: height * 0.45,
        inputHeight: 80, // Fixed input height
        boardPercent: 55,
        chatPercent: 45,
        inputPercent: 0
      };
    }
    
    if (isLandscape) {
      // Landscape mobile - side by side layout
      const height = typeof window !== 'undefined' ? window.innerHeight : 800;
      return {
        boardHeight: height,
        chatHeight: height,
        inputHeight: 60,
        boardPercent: 55,
        chatPercent: 45,
        inputPercent: 0
      };
    }
    
    // Portrait mobile - the key logic
    // CRITICAL FIX: keyboardState.availableHeight already accounts for keyboard!
    const viewportHeight = keyboardState.availableHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);
    
    if (!keyboardState.isOpen) {
      // Keyboard closed - true 50/50 split with proper separation
      const inputHeight = 70; // Fixed input height
      const availableForContent = viewportHeight - inputHeight;
      const boardHeight = availableForContent * 0.5;
      const chatHeight = availableForContent * 0.5;
      
      if (config.verbose) {
        console.log('KeyboardManager - Closed Layout:', {
          viewportHeight,
          inputHeight,
          availableForContent,
          boardHeight,
          chatHeight,
          total: boardHeight + chatHeight + inputHeight
        });
      }
      
      return {
        boardHeight,
        chatHeight,
        inputHeight,
        boardPercent: 50,
        chatPercent: 50,
        inputPercent: (inputHeight / viewportHeight) * 100
      };
    }
    
    // Keyboard open - use available viewport space directly (no double subtraction!)
    const inputHeight = 80; // Fixed input height
    const availableForContent = viewportHeight - inputHeight; // viewportHeight already keyboard-adjusted!
    
    // Simple 30/70 split of the available content space
    const boardHeight = Math.max(150, availableForContent * 0.3); // Min 150px for board
    const chatHeight = availableForContent - boardHeight;
    
    const boardPercent = (boardHeight / viewportHeight) * 100;
    const chatPercent = (chatHeight / viewportHeight) * 100;
    const inputPercent = (inputHeight / viewportHeight) * 100;
    
    if (config.verbose) {
      console.log('KeyboardManager - Open Layout:', {
        viewportHeight,
        keyboardHeight: keyboardState.height,
        availableForContent,
        boardHeight,
        chatHeight,
        inputHeight,
        total: boardHeight + chatHeight + inputHeight,
        boardPercent: `${boardPercent.toFixed(1)}%`,
        chatPercent: `${chatPercent.toFixed(1)}%`,
        inputPercent: `${inputPercent.toFixed(1)}%`
      });
    }
    
    return {
      boardHeight,
      chatHeight,
      inputHeight,
      boardPercent,
      chatPercent,
      inputPercent
    };
  }, [keyboardState, isMobile, isLandscape, config.verbose]);
  
  // Keyboard dismissal function
  const dismissKeyboard = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      activeElement.blur();
    }
  }, []);
  
  // Setup effect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Store initial viewport height
    initialViewportHeight.current = window.innerHeight;
    
    // Initial detection
    detectViewportChange();
    
    // Event listeners
    const handleResize = debouncedDetectViewportChange;
    const handleOrientationChange = () => {
      setTimeout(() => {
        initialViewportHeight.current = window.innerHeight;
        detectViewportChange();
      }, 100);
    };
    
    // Visual Viewport API (modern browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    } else {
      // Fallback
      window.addEventListener('resize', handleResize);
    }
    
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Cleanup
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
      
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [detectViewportChange, debouncedDetectViewportChange]);
  
  return {
    // State
    keyboardState,
    isMobile,
    isLandscape,
    
    // Computed values
    layoutDimensions: calculateLayoutDimensions(),
    
    // Actions
    dismissKeyboard,
    
    // Utilities
    isKeyboardSupported: isMobile && !isLandscape,
  };
}