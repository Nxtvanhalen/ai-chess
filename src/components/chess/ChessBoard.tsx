'use client';

import { useState, useCallback, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, Move, Square } from 'chess.js';
import { getPieceName } from '@/lib/chess/pieceNames';

interface ChessBoardProps {
  onMove: (move: Move) => void;
  position?: string;
  orientation?: 'white' | 'black';
  interactive?: boolean;
  onCheckmate?: (winner: 'white' | 'black') => void;
}

export default function ChessBoard({
  onMove,
  position,
  orientation = 'white',
  interactive = true,
  onCheckmate,
}: ChessBoardProps) {
  const [game, setGame] = useState(new Chess());
  const [boardWidth, setBoardWidth] = useState(400);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [checkInfo, setCheckInfo] = useState<{king: Square, attacker: Square, path: Square[]} | null>(null);

  useEffect(() => {
    const updateBoardSize = () => {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Mobile: optimize for available space in 70vh container
      // Desktop: responsive to container width
      const isMobile = viewportWidth < 1024; // lg breakpoint
      const maxSize = isMobile 
        ? Math.min(viewportWidth - 20, (viewportHeight * 0.55) - 36) // Slightly bigger board
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
      },
      [game.history({ verbose: true })[game.history({ verbose: true }).length - 1].to]: {
        backgroundColor: 'hsla(var(--chess-accent), 0.4)',
        background: 'radial-gradient(circle, hsla(var(--chess-accent), 0.6), hsla(var(--chess-accent), 0.2))',
        boxShadow: '0 0 20px hsla(var(--chess-accent), 0.6), inset 0 0 0 2px hsla(var(--chess-accent), 0.8)',
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

  const renderPieceNames = () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const pieceNames = [];
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = `${files[file]}${ranks[rank]}` as Square;
        const piece = game.get(square);
        
        if (piece) {
          const squareSize = (boardWidth - 4) / 8;
          const pieceKey = `${piece.color}${piece.type.toUpperCase()}`;
          const pieceName = getPieceName(pieceKey, square);
          
          pieceNames.push(
            <div
              key={`name-${square}`}
              className="absolute pointer-events-none transition-all duration-200"
              style={{
                left: `${2 + file * squareSize}px`,
                top: `${2 + rank * squareSize + squareSize - 10}px`,
                width: `${squareSize}px`,
                height: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className={`
                text-[8px] font-black tracking-[0.15em] uppercase
                ${piece.color === 'w' 
                  ? 'text-white' 
                  : 'text-white'
                }
              `}
              style={{
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
    <div className="chess-board-container flex items-center justify-center p-1 lg:p-6 pt-56 lg:pt-6 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20" style={{ height: `${boardWidth + 8}px` }}>
      <div style={{ width: boardWidth, height: boardWidth }} className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl pointer-events-none" />
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl opacity-10 blur-sm pointer-events-none" />
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
        
        {/* Piece names overlay */}
        <div className="absolute inset-0 pointer-events-none z-10" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          {renderPieceNames()}
        </div>
      </div>
    </div>
  );
}