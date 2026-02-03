/**
 * Dynamic imports for heavy dependencies to enable code splitting
 * These imports are cached after first load for performance
 */

// Framer Motion dynamic import
let framerMotionCache: any = null;
export async function loadFramerMotion() {
  if (framerMotionCache) return framerMotionCache;

  const framerMotion = await import('framer-motion');
  framerMotionCache = framerMotion;
  return framerMotion;
}

// Chess.js dynamic import
let chessJsCache: any = null;
export async function loadChessJs() {
  if (chessJsCache) return chessJsCache;

  const chessJs = await import('chess.js');
  chessJsCache = chessJs;
  return chessJs;
}

// React Markdown dynamic import
let reactMarkdownCache: any = null;
export async function loadReactMarkdown() {
  if (reactMarkdownCache) return reactMarkdownCache;

  const reactMarkdown = await import('react-markdown');
  reactMarkdownCache = reactMarkdown;
  return reactMarkdown;
}

// Remark GFM dynamic import
let remarkGfmCache: any = null;
export async function loadRemarkGfm() {
  if (remarkGfmCache) return remarkGfmCache;

  const remarkGfm = await import('remark-gfm');
  remarkGfmCache = remarkGfm;
  return remarkGfm;
}

// React Chessboard dynamic import
let reactChessboardCache: any = null;
export async function loadReactChessboard() {
  if (reactChessboardCache) return reactChessboardCache;

  const reactChessboard = await import('react-chessboard');
  reactChessboardCache = reactChessboard;
  return reactChessboard;
}

// UUID dynamic import
let uuidCache: any = null;
export async function loadUuid() {
  if (uuidCache) return uuidCache;

  const uuid = await import('uuid');
  uuidCache = uuid;
  return uuid;
}

// Performance optimization: Preload critical libraries on user interaction
export function preloadCriticalLibraries() {
  // Preload on first user interaction (hover, click, etc.)
  const preload = () => {
    // Preload most likely needed libraries
    loadChessJs();
    loadReactChessboard();

    // Remove listeners after first interaction
    document.removeEventListener('mousedown', preload);
    document.removeEventListener('touchstart', preload);
    document.removeEventListener('keydown', preload);
  };

  // Listen for first user interaction
  document.addEventListener('mousedown', preload, { once: true, passive: true });
  document.addEventListener('touchstart', preload, { once: true, passive: true });
  document.addEventListener('keydown', preload, { once: true, passive: true });
}

// Utility for progressive loading with retries
export async function loadWithRetry<T>(
  loader: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await loader();
    } catch (error) {
      if (i === retries - 1) throw error;

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
    }
  }
  throw new Error('Max retries exceeded');
}
