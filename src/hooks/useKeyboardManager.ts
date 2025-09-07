'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Simplified device detection hook for CSS-only keyboard handling
 * No more complex JavaScript viewport calculations - pure CSS approach
 */
export function useDeviceDetection() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  
  // Simple device detection and CSS custom property setup
  const detectDevice = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const isMobileDevice = window.innerWidth < 1024;
    const isLandscapeMode = window.innerWidth > window.innerHeight;
    
    setIsMobile(isMobileDevice);
    setIsLandscape(isLandscapeMode);
    
    // Set CSS custom properties for responsive design
    const vh = window.innerHeight * 0.01;
    const vw = window.innerWidth * 0.01;
    
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.setProperty('--vw', `${vw}px`);
    
    // Set device type classes for CSS targeting
    document.documentElement.classList.toggle('mobile', isMobileDevice);
    document.documentElement.classList.toggle('desktop', !isMobileDevice);
    document.documentElement.classList.toggle('landscape', isLandscapeMode);
    document.documentElement.classList.toggle('portrait', !isLandscapeMode);
    
  }, []);
  
  // Keyboard dismissal utility
  const dismissKeyboard = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      activeElement.blur();
    }
  }, []);
  
  // Setup effect with optimized event handling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initial detection
    detectDevice();
    
    // Optimized resize handler with proper debouncing
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(detectDevice, 100);
    };
    
    // Orientation change handler
    const handleOrientationChange = () => {
      setTimeout(() => {
        detectDevice();
      }, 150); // Slight delay for orientation change completion
    };
    
    // Use visual viewport API if available (better for mobile)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }
    
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Cleanup
    return () => {
      clearTimeout(resizeTimeout);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
      
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [detectDevice]);
  
  return {
    isMobile,
    isLandscape,
    dismissKeyboard
  };
}