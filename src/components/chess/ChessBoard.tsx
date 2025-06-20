'use client';

import { useState, useCallback, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, Move } from 'chess.js';

interface ChessBoardProps {
  onMove: (move: Move) => void;
  position?: string;
  orientation?: 'white' | 'black';
  interactive?: boolean;
}

export default function ChessBoard({
  onMove,
  position,
  orientation = 'white',
  interactive = true,
}: ChessBoardProps) {
  const [game, setGame] = useState(new Chess());
  const [boardWidth, setBoardWidth] = useState(400);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);

  useEffect(() => {
    const updateBoardSize = () => {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Mobile: optimize for available space in 50vh container
      // Desktop: responsive to container width
      const isMobile = viewportWidth < 1024; // lg breakpoint
      const maxSize = isMobile 
        ? Math.min(viewportWidth - 24, (viewportHeight * 0.50) - 48) // Account for padding
        : Math.min(viewportWidth * 0.55 - 48, viewportHeight - 120);
      
      setBoardWidth(Math.floor(maxSize));
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, []);

  useEffect(() => {
    if (position && position !== game.fen()) {
      const newGame = new Chess(position);
      setGame(newGame);
    }
  }, [position, game]);

  const handleSquareClick = useCallback((square: string) => {
    if (!interactive) return;

    const piece = game.get(square);
    
    if (selectedSquare === square) {
      // Clicking same square deselects
      setSelectedSquare(null);
      setPossibleMoves([]);
    } else if (possibleMoves.includes(square)) {
      // Clicking a possible move - make the move
      const gameCopy = new Chess(game.fen());
      try {
        const move = gameCopy.move({
          from: selectedSquare!,
          to: square,
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
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true });
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
          from: sourceSquare,
          to: targetSquare,
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
      },
      [game.history({ verbose: true })[game.history({ verbose: true }).length - 1].to]: {
        backgroundColor: 'hsla(var(--chess-accent), 0.4)',
        background: 'radial-gradient(circle, hsla(var(--chess-accent), 0.6), hsla(var(--chess-accent), 0.2))',
        boxShadow: '0 0 20px hsla(var(--chess-accent), 0.6), inset 0 0 0 2px hsla(var(--chess-accent), 0.8)',
      },
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
        background: 'radial-gradient(circle, hsla(142, 76%, 55%, 0.3), transparent 70%)',
        boxShadow: 'inset 0 0 0 2px hsla(142, 76%, 55%, 0.6)',
      };
      return acc;
    }, {} as Record<string, any>),
  };

  const renderSquareIdentifiers = () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const identifiers = [];
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const squareSize = (boardWidth - 4) / 8; // Account for border
        const isLight = (rank + file) % 2 === 0;
        
        identifiers.push(
          <div
            key={`${files[file]}${ranks[rank]}`}
            className="absolute pointer-events-none"
            style={{
              left: `${2 + file * squareSize + 4}px`,
              top: `${2 + rank * squareSize + 4}px`,
              width: `${squareSize - 8}px`,
              height: `${squareSize - 8}px`,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              padding: '2px',
            }}
          >
            <span
              className={`text-[10px] font-bold leading-none ${
                isLight 
                  ? 'text-slate-600 drop-shadow-sm' 
                  : 'text-slate-200 drop-shadow-md'
              }`}
              style={{
                textShadow: isLight 
                  ? '1px 1px 2px rgba(0,0,0,0.3)' 
                  : '1px 1px 2px rgba(0,0,0,0.8)',
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

  return (
    <div className="chess-board-container flex items-center justify-center p-3 lg:p-6 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 min-h-0 h-full">
      <div style={{ width: boardWidth, height: boardWidth }} className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl pointer-events-none group-hover:from-blue-500/20 group-hover:to-purple-500/20 transition-all duration-500" />
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500 pointer-events-none" />
        <Chessboard
          position={game.fen()}
          onPieceDrop={handleDrop}
          onSquareClick={handleSquareClick}
          boardOrientation={orientation}
          customSquareStyles={customSquareStyles}
          customBoardStyle={{
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px hsla(var(--primary), 0.1)',
            border: '2px solid hsla(var(--border), 0.8)',
            background: 'linear-gradient(135deg, hsl(var(--chess-light)), hsl(var(--chess-dark)))',
          }}
          customDarkSquareStyle={{ 
            backgroundColor: 'hsl(var(--chess-dark))',
            background: 'linear-gradient(135deg, hsl(var(--chess-dark)), hsl(234 25% 40%))',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)'
          }}
          customLightSquareStyle={{ 
            backgroundColor: 'hsl(var(--chess-light))',
            background: 'linear-gradient(135deg, hsl(var(--chess-light)), hsl(45 15% 92%))',
            boxShadow: 'inset 0 1px 3px rgba(255, 255, 255, 0.3)'
          }}
          showBoardNotation={false}
          animationDuration={200}
          arePiecesDraggable={interactive}
        />
        
        {/* Square identifiers overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          {renderSquareIdentifiers()}
        </div>
        
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-medium text-slate-600 dark:text-slate-400 opacity-60">
          Chess Butler AI
        </div>
      </div>
    </div>
  );
}