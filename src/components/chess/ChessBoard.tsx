'use client';

import { Chess, type Move, type Square } from 'chess.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
// import { holographicPieces as customPieces } from './HolographicPieces';
import { type BoardTheme, defaultTheme } from '@/lib/chess/boardThemes';
import { getPieceName } from '@/lib/chess/pieceNames';
import { customPieces } from './CustomPieces';

interface ChessBoardProps {
  onMove: (move: Move) => void;
  position?: string;
  orientation?: 'white' | 'black';
  interactive?: boolean;
  onCheckmate?: (winner: 'white' | 'black') => void;
  theme?: BoardTheme;
}

export default function ChessBoard({
  onMove,
  position,
  orientation = 'white',
  interactive = true,
  onCheckmate,
  theme = defaultTheme,
}: ChessBoardProps) {
  const [game, setGame] = useState(new Chess());
  // Calculate initial size synchronously to prevent flash
  const [boardWidth, setBoardWidth] = useState(() => {
    if (typeof window === 'undefined') return 400;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mobile = vw < 1024;
    const landscape = vw > vh;
    if (mobile && !landscape) {
      return Math.floor(Math.min(vw - 16, vh * 0.55));
    } else if (mobile && landscape) {
      return Math.floor(Math.min(vh - 20, vw * 0.48 - 20));
    }
    return Math.floor(Math.min(vw * 0.55 - 48, vh - 120));
  });
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [checkInfo, setCheckInfo] = useState<{
    king: Square;
    attacker: Square;
    path: Square[];
  } | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [overlayKey, setOverlayKey] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Accessibility: keyboard navigation state
  const [focusedSquare, setFocusedSquare] = useState<Square>('e2');
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('');
  const [isBoardFocused, setIsBoardFocused] = useState(false);
  const [isKeyboardNavigationActive, setIsKeyboardNavigationActive] = useState(false);

  // Smooth fade-in effect to mask SVG hydration
  useEffect(() => {
    // Initial delay to let React hydrate and browser paint the SVGs
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateBoardSize = () => {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const mobile = viewportWidth < 1024; // lg breakpoint
      const landscape = viewportWidth > viewportHeight;

      setIsMobile(mobile);
      setIsLandscape(landscape);

      let maxSize;

      if (mobile && !landscape) {
        // Mobile portrait: use smaller of width or 55% of height
        const maxHeight = viewportHeight * 0.55;
        maxSize = Math.min(viewportWidth - 16, maxHeight);
      } else if (mobile && landscape) {
        // Mobile landscape: use available height
        maxSize = Math.min(viewportHeight - 20, viewportWidth * 0.48 - 20);
      } else {
        // Desktop: responsive to container width
        maxSize = Math.min(viewportWidth * 0.55 - 48, viewportHeight - 120);
      }

      setBoardWidth(Math.floor(Math.max(maxSize, 280)));
    };

    updateBoardSize(); // Initial call

    // Enhanced resize handler with debounce and orientation support
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      // Small debounce to wait for orientation transition
      resizeTimer = setTimeout(updateBoardSize, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Handle orientation changes - wait for CSS transitions to complete
  useEffect(() => {
    const timer = setTimeout(() => {
      // Force overlay re-positioning after CSS transitions complete
      setOverlayKey((prev) => prev + 1);
    }, 350); // 300ms transition + 50ms buffer

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (position && position !== game.fen()) {
      const newGame = new Chess(position);
      setGame(newGame);
    }
  }, [position, game.fen]);

  // Find the path between two squares for sliding pieces
  const getPathBetweenSquares = useCallback((from: Square, to: Square): Square[] => {
    const path: Square[] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fromFile = files.indexOf(from[0]);
    const fromRank = parseInt(from[1], 10);
    const toFile = files.indexOf(to[0]);
    const toRank = parseInt(to[1], 10);

    const fileStep = fromFile === toFile ? 0 : (toFile - fromFile) / Math.abs(toFile - fromFile);
    const rankStep = fromRank === toRank ? 0 : (toRank - fromRank) / Math.abs(toRank - fromRank);

    let currentFile = fromFile + fileStep;
    let currentRank = fromRank + rankStep;

    while (currentFile !== toFile || currentRank !== toRank) {
      path.push(`${files[currentFile]}${currentRank}` as Square);
      currentFile += fileStep;
      currentRank += rankStep;
    }

    return path;
  }, []);

  // Check for check and checkmate state after every move
  useEffect(() => {
    // Check for checkmate
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'black' : 'white';
      const message = `Checkmate! ${winner === 'white' ? 'White' : 'Black'} wins!`;
      setStatusAnnouncement((prev) => (prev === message ? prev : message));
      if (onCheckmate) {
        onCheckmate(winner);
      }
    } else if (game.isDraw()) {
      setStatusAnnouncement((prev) => (prev === 'Game is a draw!' ? prev : 'Game is a draw!'));
    } else if (game.inCheck()) {
      const inCheckColor = game.turn() === 'w' ? 'White' : 'Black';
      const message = `${inCheckColor} is in check!`;
      setStatusAnnouncement((prev) => (prev === message ? prev : message));
    }

    // Check for check
    if (game.inCheck()) {
      const kingColor = game.turn();
      const board = game.board();
      let kingSquare: Square | null = null;

      // Find the king in check
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = board[row][col];
          if (piece && piece.type === 'k' && piece.color === kingColor) {
            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            kingSquare = `${files[col]}${8 - row}` as Square;
            break;
          }
        }
        if (kingSquare) break;
      }

      if (kingSquare) {
        // Find the attacking piece
        const _moves = game.moves({ verbose: true });
        const gameCopy = new Chess(game.fen());
        gameCopy.turn() === 'w'
          ? gameCopy.load(game.fen().replace(' w ', ' b '))
          : gameCopy.load(game.fen().replace(' b ', ' w '));

        const attackingMoves = gameCopy
          .moves({ verbose: true })
          .filter((move) => move.to === kingSquare);

        if (attackingMoves.length > 0) {
          const attackMove = attackingMoves[0];
          const attackerSquare = attackMove.from;
          const attackingPiece = game.get(attackerSquare);

          let path: Square[] = [];
          if (
            attackingPiece &&
            (attackingPiece.type === 'q' ||
              attackingPiece.type === 'r' ||
              attackingPiece.type === 'b')
          ) {
            path = getPathBetweenSquares(attackerSquare, kingSquare);
          }

          setCheckInfo({ king: kingSquare, attacker: attackerSquare, path });
        }
      }
    } else {
      setCheckInfo(null);
    }
  }, [game, onCheckmate, getPathBetweenSquares]);

  const handleSquareClick = useCallback(
    (square: string) => {
      if (!interactive) return;
      setIsKeyboardNavigationActive(false);

      const piece = game.get(square as Square);

      if (selectedSquare === square) {
        // Clicking same square deselects
        setSelectedSquare(null);
        setPossibleMoves([]);
      } else if (possibleMoves.includes(square as Square)) {
        // Clicking a possible move - make the move
        const gameCopy = new Chess(game.fen());
        try {
          const move = gameCopy.move({
            from: selectedSquare!,
            to: square as Square,
            promotion: 'q',
          });
          if (move) {
            setGame(gameCopy);
            onMove(move);
            setSelectedSquare(null);
            setPossibleMoves([]);
          }
        } catch (error) {
          console.error('Invalid move:', error);
        }
      } else if (piece && piece.color === game.turn()) {
        // Clicking a piece of current player - select it and show moves
        setSelectedSquare(square as Square);
        const moves = game.moves({ square: square as Square, verbose: true });
        setPossibleMoves(moves.map((move) => move.to));
      } else {
        // Clicking empty square or opponent piece - deselect
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    },
    [game, interactive, onMove, selectedSquare, possibleMoves],
  );

  // Accessibility: Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!interactive) return;
      setIsKeyboardNavigationActive(true);

      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

      const currentFile = files.indexOf(focusedSquare[0]);
      const currentRank = ranks.indexOf(focusedSquare[1]);

      let newFile = currentFile;
      let newRank = currentRank;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newRank = Math.min(currentRank + 1, 7);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newRank = Math.max(currentRank - 1, 0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newFile = Math.max(currentFile - 1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newFile = Math.min(currentFile + 1, 7);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleSquareClick(focusedSquare);
          return;
        case 'Escape':
          e.preventDefault();
          setSelectedSquare(null);
          setPossibleMoves([]);
          setStatusAnnouncement('Selection cleared');
          return;
        default:
          return;
      }

      const newSquare = `${files[newFile]}${ranks[newRank]}` as Square;
      setFocusedSquare(newSquare);

      // Announce the square and any piece on it
      const piece = game.get(newSquare);
      if (piece) {
        const colorName = piece.color === 'w' ? 'White' : 'Black';
        const pieceName = { k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn' }[
          piece.type
        ];
        setStatusAnnouncement(`${newSquare.toUpperCase()}, ${colorName} ${pieceName}`);
      } else {
        setStatusAnnouncement(`${newSquare.toUpperCase()}, empty`);
      }
    },
    [interactive, focusedSquare, game, handleSquareClick],
  );

  const handleDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!interactive) return false;
      setIsKeyboardNavigationActive(false);

      const gameCopy = new Chess(game.fen());

      try {
        const move = gameCopy.move({
          from: sourceSquare as Square,
          to: targetSquare as Square,
          promotion: 'q', // Always promote to queen for simplicity
        });

        if (move === null) return false;

        setGame(gameCopy);
        onMove(move);

        // Clear selection after successful move
        setSelectedSquare(null);
        setPossibleMoves([]);

        return true;
      } catch {
        return false;
      }
    },
    [game, interactive, onMove],
  );

  const customSquareStyles = {
    // Highlight last move with futuristic glow
    ...(game.history({ verbose: true }).length > 0 && {
      [game.history({ verbose: true })[game.history({ verbose: true }).length - 1].from]: {
        backgroundColor: 'hsla(var(--chess-highlight), 0.4)',
        background:
          'radial-gradient(circle, hsla(var(--chess-highlight), 0.6), hsla(var(--chess-highlight), 0.2))',
        boxShadow:
          '0 0 20px hsla(var(--chess-highlight), 0.6), inset 0 0 0 2px hsla(var(--chess-highlight), 0.8)',
        animation: 'trail-from 2s ease-in-out infinite',
      },
      [game.history({ verbose: true })[game.history({ verbose: true }).length - 1].to]: {
        backgroundColor: 'hsla(var(--chess-accent), 0.4)',
        background:
          'radial-gradient(circle, hsla(var(--chess-accent), 0.6), hsla(var(--chess-accent), 0.2))',
        boxShadow:
          '0 0 20px hsla(var(--chess-accent), 0.6), inset 0 0 0 2px hsla(var(--chess-accent), 0.8)',
        animation: 'trail-to 2s ease-in-out infinite',
      },
    }),
    // Highlight check situation
    ...(checkInfo && {
      // King in check - intense red
      [checkInfo.king]: {
        backgroundColor: 'hsla(0, 100%, 50%, 0.7)',
        background: 'radial-gradient(circle, hsla(0, 100%, 50%, 0.9), hsla(0, 100%, 40%, 0.5))',
        boxShadow: '0 0 30px hsla(0, 100%, 50%, 1), inset 0 0 0 4px hsla(0, 100%, 50%, 1)',
        animation: 'pulse 1s infinite',
      },
      // Attacking piece - red highlight
      [checkInfo.attacker]: {
        backgroundColor: 'hsla(0, 100%, 50%, 0.6)',
        background: 'radial-gradient(circle, hsla(0, 100%, 50%, 0.7), hsla(0, 100%, 40%, 0.3))',
        boxShadow: '0 0 25px hsla(0, 100%, 50%, 0.8), inset 0 0 0 3px hsla(0, 100%, 50%, 0.9)',
      },
      // Path squares - red line
      ...checkInfo.path.reduce(
        (acc, square) => {
          acc[square] = {
            backgroundColor: 'hsla(0, 100%, 50%, 0.4)',
            background: 'linear-gradient(45deg, hsla(0, 100%, 50%, 0.5), hsla(0, 100%, 40%, 0.3))',
            boxShadow: 'inset 0 0 0 2px hsla(0, 100%, 50%, 0.7)',
          };
          return acc;
        },
        {} as Record<string, any>,
      ),
    }),
    // Highlight selected square
    ...(selectedSquare && {
      [selectedSquare]: {
        backgroundColor: 'hsla(142, 76%, 55%, 0.6)',
        boxShadow: '0 0 15px hsla(142, 76%, 55%, 0.8), inset 0 0 0 3px hsla(142, 76%, 55%, 0.9)',
      },
    }),
    // Highlight possible moves
    ...possibleMoves.reduce(
      (acc, square) => {
        acc[square] = {
          background:
            'radial-gradient(circle, hsla(142, 76%, 55%, 0.7), hsla(142, 76%, 55%, 0.3) 50%, transparent 80%)',
          boxShadow: '0 0 25px hsla(142, 76%, 55%, 0.8), inset 0 0 0 3px hsla(142, 76%, 55%, 0.9)',
          border: '2px solid hsla(142, 76%, 55%, 0.8)',
        };
        return acc;
      },
      {} as Record<string, any>,
    ),
  };

  // Accessibility: Add keyboard focus indicator only when board has focus
  const squareStylesWithFocus = {
    ...customSquareStyles,
    ...(isBoardFocused && isKeyboardNavigationActive && focusedSquare && {
      [focusedSquare]: {
        ...(customSquareStyles[focusedSquare] || {}),
        outline: '3px solid hsla(200, 100%, 60%, 0.9)',
        outlineOffset: '-3px',
      },
    }),
  };

  const renderSquareIdentifiers = () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const identifiers = [];

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        identifiers.push(
          <div
            key={`${files[file]}${ranks[rank]}`}
            className="absolute pointer-events-none"
            style={{
              left: `${(file / 8) * 100}%`,
              top: `${(rank / 8) * 100}%`,
              width: '12.5%',
              height: '12.5%',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              padding: '2px',
            }}
          >
            <span
              className="font-bold leading-none text-black"
              style={{
                fontSize: 'clamp(6px, 1.5cqi, 14px)',
                background: 'rgba(245, 240, 230, 0.65)',
                padding: '0px 1px',
                borderRadius: '1px',
                border: '0.5px solid rgba(240, 235, 225, 0.7)',
                boxShadow: '0 0.5px 1px rgba(0, 0, 0, 0.1)',
              }}
            >
              {files[file]}
              {ranks[rank]}
            </span>
          </div>,
        );
      }
    }

    return identifiers;
  };

  const renderPieceNames = () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const pieceNames = [];

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = `${files[file]}${ranks[rank]}` as Square;
        const piece = game.get(square);

        if (piece) {
          const pieceKey = `${piece.color}${piece.type.toUpperCase()}`;
          const pieceName = getPieceName(pieceKey, square);

          pieceNames.push(
            <div
              key={`name-${square}`}
              className="absolute pointer-events-none transition-all duration-200"
              style={{
                left: `${(file / 8) * 100}%`,
                top: `${(rank / 8) * 100}%`,
                width: '12.5%',
                height: '12.5%',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: '0',
              }}
            >
              <span
                className="font-black tracking-[0.15em] uppercase text-white"
                style={{
                  fontSize: 'clamp(6px, 1.2cqi, 12px)',
                  transform: 'scale(0.95)',
                  transformOrigin: 'center',
                  textShadow:
                    '0 0 3px #000, 0 0 5px #000, 0 1px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000',
                  WebkitFontSmoothing: 'subpixel-antialiased',
                  MozOsxFontSmoothing: 'auto',
                  textRendering: 'geometricPrecision',
                  fontWeight: 900,
                  letterSpacing: '0.15em',
                }}
              >
                {pieceName.title}
              </span>
            </div>,
          );
        }
      }
    }

    return pieceNames;
  };

  // Generate current turn description for screen readers
  const turnDescription = game.turn() === 'w' ? 'White to move' : 'Black to move';
  const gameStatus = game.isCheckmate()
    ? 'Checkmate'
    : game.isDraw()
      ? 'Draw'
      : game.inCheck()
        ? 'Check'
        : '';

  return (
    <div
      className={`chess-board-container flex items-center justify-center bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 ${
        isMobile && isLandscape ? 'p-2 h-full' : 'px-1 pt-2 pb-0 lg:px-6 lg:pt-6 lg:pb-0'
      }`}
      style={{
        width: boardWidth,
        height: boardWidth,
      }}
    >
      {/* Accessibility: Live region for announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusAnnouncement}
      </div>

      <div
        ref={boardContainerRef}
        style={{ width: boardWidth, height: boardWidth }}
        className="relative outline-none"
        role="application"
        aria-label={`Chess board. ${turnDescription}. ${gameStatus}. Use arrow keys to navigate, Enter or Space to select or move pieces, Escape to cancel selection.`}
        tabIndex={isMobile ? -1 : 0}
        onKeyDown={handleKeyDown}
        onFocus={() => !isMobile && setIsBoardFocused(true)}
        onBlur={() => setIsBoardFocused(false)}
        onMouseDown={() => setIsKeyboardNavigationActive(false)}
        onTouchStart={() => setIsKeyboardNavigationActive(false)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl pointer-events-none" />
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl opacity-10 blur-sm pointer-events-none" />
        <Chessboard
          boardWidth={boardWidth}
          position={game.fen()}
          onPieceDrop={handleDrop}
          onSquareClick={handleSquareClick}
          boardOrientation={orientation}
          customPieces={customPieces}
          customSquareStyles={squareStylesWithFocus}
          customBoardStyle={{
            borderRadius: theme.boardStyle.borderRadius,
            boxShadow: theme.boardStyle.boxShadow,
            border: theme.boardStyle.border,
            ...(theme.boardStyle.background && { background: theme.boardStyle.background }),
            transition: 'all 0.5s ease-in-out',
          }}
          customDarkSquareStyle={{
            background: theme.darkSquare.background,
            ...(theme.darkSquare.boxShadow && { boxShadow: theme.darkSquare.boxShadow }),
            transition: 'all 0.5s ease-in-out',
          }}
          customLightSquareStyle={{
            background: theme.lightSquare.background,
            ...(theme.lightSquare.boxShadow && { boxShadow: theme.lightSquare.boxShadow }),
            transition: 'all 0.5s ease-in-out',
          }}
          showBoardNotation={false}
          animationDuration={800}
          arePiecesDraggable={interactive}
        />

        {/* Square identifiers overlay - sized to match actual rendered board */}
        <div
          key={`identifiers-${overlayKey}`}
          className="absolute pointer-events-none"
          style={{
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '16px',
            overflow: 'hidden',
            containerType: 'inline-size',
          }}
        >
          {renderSquareIdentifiers()}
        </div>

        {/* Piece names overlay - sized to match actual rendered board */}
        <div
          key={`pieces-${overlayKey}`}
          className="absolute pointer-events-none z-10"
          style={{
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '16px',
            overflow: 'hidden',
            containerType: 'inline-size',
          }}
        >
          {renderPieceNames()}
        </div>

        {/* Loading Overlay - hides until board is ready */}
        {!isLoaded && (
          <div className="absolute inset-0 z-50 bg-slate-900 flex items-center justify-center rounded-2xl">
            <div className="bg-black rounded-2xl flex items-center justify-center w-full h-full">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 animate-pulse shadow-[0_0_30px_rgba(168,85,247,0.5)]" />
                <p className="text-slate-400 text-sm font-medium tracking-widest uppercase animate-pulse">
                  Initializing Board
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
