'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, Move, Square } from 'chess.js';
import { getPieceName } from '@/lib/chess/pieceNames';
import { customPieces } from './CustomPieces';
// import { holographicPieces as customPieces } from './HolographicPieces';
import { BoardTheme, defaultTheme } from '@/lib/chess/boardThemes';

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
  const [boardWidth, setBoardWidth] = useState(400);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [checkInfo, setCheckInfo] = useState<{ king: Square, attacker: Square, path: Square[] } | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [overlayKey, setOverlayKey] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

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

      // On mobile portrait, we let CSS (flex + aspect-ratio) handle the sizing
      // so we don't need to calculate a specific pixel width here.
      if (mobile && !landscape) {
        setBoardWidth(0); // value 0 acts as a flag to disable inline styles
        return;
      }

      let maxSize;

      if (mobile && landscape) {
        // Mobile landscape: use available height minus some padding
        maxSize = Math.min(viewportHeight - 40, viewportWidth * 0.55 - 40);
      } else {
        // Desktop: responsive to container width
        maxSize = Math.min(viewportWidth * 0.55 - 48, viewportHeight - 120);
      }

      setBoardWidth(Math.floor(Math.max(maxSize, 300))); // Minimum size of 300px
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, []);

  // Handle orientation changes - wait for CSS transitions to complete
  useEffect(() => {
    const timer = setTimeout(() => {
      // Force overlay re-positioning after CSS transitions complete
      setOverlayKey(prev => prev + 1);
    }, 350); // 300ms transition + 50ms buffer

    return () => clearTimeout(timer);
  }, [isMobile, isLandscape]);

  useEffect(() => {
    if (position && position !== game.fen()) {
      const newGame = new Chess(position);
      setGame(newGame);
    }
  }, [position]);

  // Find the path between two squares for sliding pieces
  const getPathBetweenSquares = (from: Square, to: Square): Square[] => {
    const path: Square[] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fromFile = files.indexOf(from[0]);
    const fromRank = parseInt(from[1]);
    const toFile = files.indexOf(to[0]);
    const toRank = parseInt(to[1]);

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
  };

  // Check for check and checkmate state after every move
  useEffect(() => {
    // Check for checkmate
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'black' : 'white';
      if (onCheckmate) {
        onCheckmate(winner);
      }
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
        const moves = game.moves({ verbose: true });
        const gameCopy = new Chess(game.fen());
        gameCopy.turn() === 'w' ? gameCopy.load(game.fen().replace(' w ', ' b ')) : gameCopy.load(game.fen().replace(' b ', ' w '));

        const attackingMoves = gameCopy.moves({ verbose: true }).filter(move => move.to === kingSquare);

        if (attackingMoves.length > 0) {
          const attackMove = attackingMoves[0];
          const attackerSquare = attackMove.from;
          const attackingPiece = game.get(attackerSquare);

          let path: Square[] = [];
          if (attackingPiece && (attackingPiece.type === 'q' || attackingPiece.type === 'r' || attackingPiece.type === 'b')) {
            path = getPathBetweenSquares(attackerSquare, kingSquare);
          }

          setCheckInfo({ king: kingSquare, attacker: attackerSquare, path });
        }
      }
    } else {
      setCheckInfo(null);
    }
  }, [game, onCheckmate]);

  const handleSquareClick = useCallback((square: string) => {
    if (!interactive) return;

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
      setPossibleMoves(moves.map(move => move.to));
    } else {
      // Clicking empty square or opponent piece - deselect
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  }, [game, interactive, onMove, selectedSquare, possibleMoves]);

  const handleDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!interactive) return false;

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
    [game, interactive, onMove]
  );

  const customSquareStyles = {
    // Highlight last move with futuristic glow
    ...(game.history({ verbose: true }).length > 0 && {
      [game.history({ verbose: true })[game.history({ verbose: true }).length - 1].from]: {
        backgroundColor: 'hsla(var(--chess-highlight), 0.4)',
        background: 'radial-gradient(circle, hsla(var(--chess-highlight), 0.6), hsla(var(--chess-highlight), 0.2))',
        boxShadow: '0 0 20px hsla(var(--chess-highlight), 0.6), inset 0 0 0 2px hsla(var(--chess-highlight), 0.8)',
        animation: 'trail-from 2s ease-in-out infinite',
      },
      [game.history({ verbose: true })[game.history({ verbose: true }).length - 1].to]: {
        backgroundColor: 'hsla(var(--chess-accent), 0.4)',
        background: 'radial-gradient(circle, hsla(var(--chess-accent), 0.6), hsla(var(--chess-accent), 0.2))',
        boxShadow: '0 0 20px hsla(var(--chess-accent), 0.6), inset 0 0 0 2px hsla(var(--chess-accent), 0.8)',
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
      ...checkInfo.path.reduce((acc, square) => {
        acc[square] = {
          backgroundColor: 'hsla(0, 100%, 50%, 0.4)',
          background: 'linear-gradient(45deg, hsla(0, 100%, 50%, 0.5), hsla(0, 100%, 40%, 0.3))',
          boxShadow: 'inset 0 0 0 2px hsla(0, 100%, 50%, 0.7)',
        };
        return acc;
      }, {} as Record<string, any>),
    }),
    // Highlight selected square
    ...(selectedSquare && {
      [selectedSquare]: {
        backgroundColor: 'hsla(142, 76%, 55%, 0.6)',
        boxShadow: '0 0 15px hsla(142, 76%, 55%, 0.8), inset 0 0 0 3px hsla(142, 76%, 55%, 0.9)',
      },
    }),
    // Highlight possible moves
    ...possibleMoves.reduce((acc, square) => {
      acc[square] = {
        background: 'radial-gradient(circle, hsla(142, 76%, 55%, 0.7), hsla(142, 76%, 55%, 0.3) 50%, transparent 80%)',
        boxShadow: '0 0 25px hsla(142, 76%, 55%, 0.8), inset 0 0 0 3px hsla(142, 76%, 55%, 0.9)',
        border: '2px solid hsla(142, 76%, 55%, 0.8)',
      };
      return acc;
    }, {} as Record<string, any>),
  };

  const renderSquareIdentifiers = () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const identifiers = [];

    // Use actual rendered board size for accurate positioning
    const actualBoardSize = boardContainerRef.current?.getBoundingClientRect().width || boardWidth;
    const borderSize = 2;
    const squareSize = (actualBoardSize - (borderSize * 2)) / 8;

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const isLight = (rank + file) % 2 === 0;

        // Improved positioning calculation
        const leftPosition = borderSize + (file * squareSize);
        const topPosition = borderSize + (rank * squareSize);

        identifiers.push(
          <div
            key={`${files[file]}${ranks[rank]}`}
            className="absolute pointer-events-none"
            style={{
              left: `${leftPosition}px`,
              top: `${topPosition}px`,
              width: `${squareSize}px`,
              height: `${squareSize}px`,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              padding: `${Math.max(1, squareSize * 0.05)}px`,
            }}
          >
            <span
              className="font-bold leading-none text-black"
              style={{
                fontSize: `${Math.max(6, squareSize * 0.15)}px`,
                background: 'rgba(245, 240, 230, 0.65)',
                padding: '0px 1px',
                borderRadius: '1px',
                border: '0.5px solid rgba(240, 235, 225, 0.7)',
                boxShadow: '0 0.5px 1px rgba(0, 0, 0, 0.1)',
              }}
            >
              {files[file]}{ranks[rank]}
            </span>
          </div>
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
          // Use actual rendered board size for accurate positioning
          const actualBoardSize = boardContainerRef.current?.getBoundingClientRect().width || boardWidth;
          const borderSize = 2;
          const squareSize = (actualBoardSize - (borderSize * 2)) / 8;
          const pieceKey = `${piece.color}${piece.type.toUpperCase()}`;
          const pieceName = getPieceName(pieceKey, square);

          // Improved positioning calculation matching square identifiers
          const leftPosition = borderSize + (file * squareSize);
          const topPosition = borderSize + (rank * squareSize) + squareSize - Math.max(8, squareSize * 0.15);

          pieceNames.push(
            <div
              key={`name-${square}`}
              className="absolute pointer-events-none transition-all duration-200"
              style={{
                left: `${leftPosition}px`,
                top: `${topPosition}px`,
                width: `${squareSize}px`,
                height: `${Math.max(8, squareSize * 0.15)}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className={`
                font-black tracking-[0.15em] uppercase
                ${piece.color === 'w'
                  ? 'text-white'
                  : 'text-white'
                }
              `}
                style={{
                  fontSize: `${Math.max(6, squareSize * 0.12)}px`,
                  transform: 'scale(0.95)',
                  transformOrigin: 'center',
                  textShadow: '0 0 3px #000, 0 0 5px #000, 0 1px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000',
                  WebkitFontSmoothing: 'subpixel-antialiased',
                  MozOsxFontSmoothing: 'auto',
                  textRendering: 'geometricPrecision',
                  fontWeight: 900,
                  letterSpacing: '0.15em'
                }}>
                {pieceName.title}
              </span>
            </div>
          );
        }
      }
    }

    return pieceNames;
  };

  return (
    <div
      className={`chess-board-container flex items-center justify-center bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 ${isMobile && isLandscape
        ? 'p-2 h-full'
        : 'p-1 lg:p-6 pt-2 lg:pt-6'
        }`}
      style={boardWidth > 0 ? {
        height: isMobile && isLandscape ? '100vh' : `${boardWidth + 8}px`,
        minHeight: isMobile && isLandscape ? '100vh' : 'auto'
      } : undefined}>
      <div ref={boardContainerRef} style={boardWidth > 0 ? { width: boardWidth, height: boardWidth } : { width: '100%', height: '100%' }} className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl pointer-events-none" />
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl opacity-10 blur-sm pointer-events-none" />
        <Chessboard
          position={game.fen()}
          onPieceDrop={handleDrop}
          onSquareClick={handleSquareClick}
          boardOrientation={orientation}
          customPieces={customPieces}
          customSquareStyles={customSquareStyles}
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
        <div key={`identifiers-${overlayKey}`} className="absolute pointer-events-none" style={{
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          {renderSquareIdentifiers()}
        </div>

        {/* Piece names overlay - sized to match actual rendered board */}
        <div key={`pieces-${overlayKey}`} className="absolute pointer-events-none z-10" style={{
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          {renderPieceNames()}
        </div>

        {/* Smooth Loading Overlay - Masks the initial SVG hydration */}
        <div
          className={`absolute inset-0 z-50 bg-slate-900 flex items-center justify-center rounded-2xl transition-opacity duration-700 ease-in-out ${isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <div className="bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-indigo-900/40 rounded-2xl flex items-center justify-center w-full h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 animate-pulse shadow-[0_0_30px_rgba(168,85,247,0.5)]" />
              <p className="text-slate-400 text-sm font-medium tracking-widest uppercase animate-pulse">Initializing Board</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}