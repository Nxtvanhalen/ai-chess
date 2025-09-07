import { Chess, Square } from 'chess.js';

interface PieceValue {
  [key: string]: number;
}

interface MaterialCount {
  white: { [piece: string]: number };
  black: { [piece: string]: number };
  whiteTotal: number;
  blackTotal: number;
  imbalance: number;
}

interface ThreatInfo {
  square: Square;
  piece: string;
  attackedBy: Square[];
  defendedBy: Square[];
  isHanging: boolean;
  value: number;
}

interface PositionAnalysis {
  materialCount: MaterialCount;
  threats: ThreatInfo[];
  kingSafety: {
    white: { safe: boolean; threats: Square[]; castlingAvailable: boolean };
    black: { safe: boolean; threats: Square[]; castlingAvailable: boolean };
  };
  tacticalPatterns: string[];
  criticalSquares: Square[];
  gamePhase: 'opening' | 'middlegame' | 'endgame';
  urgencyLevel: 'emergency' | 'tactical' | 'strategic';
  recommendations: string[];
}

export class PositionAnalyzer {
  private chess: Chess;
  private pieceValues: PieceValue = {
    'p': 1,   // Pawn
    'n': 3,   // Knight  
    'b': 3,   // Bishop
    'r': 5,   // Rook
    'q': 9,   // Queen
    'k': 0    // King (invaluable)
  };

  constructor(fen: string) {
    this.chess = new Chess(fen);
  }

  public analyzePosition(): PositionAnalysis {
    const materialCount = this.analyzeMaterial();
    const threats = this.analyzeThreats();
    const kingSafety = this.analyzeKingSafety();
    const tacticalPatterns = this.detectTacticalPatterns();
    const criticalSquares = this.findCriticalSquares();
    const gamePhase = this.determineGamePhase(materialCount);
    const urgencyLevel = this.determineUrgency(threats, kingSafety, materialCount);
    const recommendations = this.generateRecommendations(materialCount, threats, kingSafety, urgencyLevel);

    return {
      materialCount,
      threats,
      kingSafety,
      tacticalPatterns,
      criticalSquares,
      gamePhase,
      urgencyLevel,
      recommendations
    };
  }

  private analyzeMaterial(): MaterialCount {
    const board = this.chess.board();
    const white = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
    const black = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

    // Count pieces
    board.forEach(row => {
      row.forEach(square => {
        if (square) {
          if (square.color === 'w') {
            white[square.type]++;
          } else {
            black[square.type]++;
          }
        }
      });
    });

    // Calculate totals
    const whiteTotal = Object.entries(white).reduce((sum, [piece, count]) => 
      sum + (this.pieceValues[piece] * count), 0);
    const blackTotal = Object.entries(black).reduce((sum, [piece, count]) => 
      sum + (this.pieceValues[piece] * count), 0);
    
    const imbalance = whiteTotal - blackTotal;

    return {
      white,
      black, 
      whiteTotal,
      blackTotal,
      imbalance: this.chess.turn() === 'w' ? imbalance : -imbalance // From current player's perspective
    };
  }

  private analyzeThreats(): ThreatInfo[] {
    const threats: ThreatInfo[] = [];
    const board = this.chess.board();
    
    // Check each square for pieces and their threat status
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = this.indexToSquare(rank, file);
        const piece = this.chess.get(square);
        
        if (piece) {
          const attackedBy = this.getAttackersOfSquare(square, piece.color === 'w' ? 'b' : 'w');
          const defendedBy = this.getAttackersOfSquare(square, piece.color);
          const isHanging = attackedBy.length > 0 && defendedBy.length === 0;
          const value = this.pieceValues[piece.type];

          if (attackedBy.length > 0 || isHanging) {
            threats.push({
              square,
              piece: `${piece.color}${piece.type}`,
              attackedBy,
              defendedBy,
              isHanging,
              value
            });
          }
        }
      }
    }

    return threats.sort((a, b) => {
      // Prioritize hanging pieces, then by value
      if (a.isHanging && !b.isHanging) return -1;
      if (!a.isHanging && b.isHanging) return 1;
      return b.value - a.value;
    });
  }

  private analyzeKingSafety(): PositionAnalysis['kingSafety'] {
    const whiteKing = this.findKing('w');
    const blackKing = this.findKing('b');
    
    const whiteThreats = whiteKing ? this.getAttackersOfSquare(whiteKing, 'b') : [];
    const blackThreats = blackKing ? this.getAttackersOfSquare(blackKing, 'w') : [];

    return {
      white: {
        safe: whiteThreats.length === 0 && !this.chess.inCheck(),
        threats: whiteThreats,
        castlingAvailable: this.canCastle('w')
      },
      black: {
        safe: blackThreats.length === 0 && !this.chess.inCheck(),
        threats: blackThreats, 
        castlingAvailable: this.canCastle('b')
      }
    };
  }

  private detectTacticalPatterns(): string[] {
    const patterns: string[] = [];
    
    // Check for checks
    if (this.chess.inCheck()) {
      patterns.push('CHECK');
    }

    // Check for checkmate
    if (this.chess.isCheckmate()) {
      patterns.push('CHECKMATE');
    }

    // Check for stalemate
    if (this.chess.isStalemate()) {
      patterns.push('STALEMATE');
    }

    // Look for potential forks, pins, skewers (simplified detection)
    const moves = this.chess.moves({ verbose: true });
    for (const move of moves) {
      if (move.captured) {
        patterns.push('CAPTURE_AVAILABLE');
        break;
      }
    }

    return patterns;
  }

  private findCriticalSquares(): Square[] {
    const critical: Square[] = [];
    
    // Add squares around kings
    const whiteKing = this.findKing('w');
    const blackKing = this.findKing('b');
    
    if (whiteKing) {
      critical.push(...this.getAdjacentSquares(whiteKing));
    }
    if (blackKing) {
      critical.push(...this.getAdjacentSquares(blackKing));
    }

    return [...new Set(critical)]; // Remove duplicates
  }

  private determineGamePhase(materialCount: MaterialCount): 'opening' | 'middlegame' | 'endgame' {
    const totalPieces = materialCount.whiteTotal + materialCount.blackTotal;
    
    if (totalPieces < 15) return 'endgame';
    if (totalPieces < 25) return 'middlegame';
    return 'opening';
  }

  private determineUrgency(threats: ThreatInfo[], kingSafetyParam: PositionAnalysis['kingSafety'], materialCount: MaterialCount): 'emergency' | 'tactical' | 'strategic' {
    // Emergency: King in danger or major material loss imminent
    const currentColor = this.chess.turn();
    const kingSafetyStatus = currentColor === 'w' ? kingSafetyParam.white : kingSafetyParam.black;
    
    if (!kingSafetyStatus.safe || this.chess.inCheck()) {
      return 'emergency';
    }

    // Major material imbalance or hanging pieces
    if (Math.abs(materialCount.imbalance) >= 5 || threats.some(t => t.isHanging && t.value >= 3)) {
      return 'emergency';
    }

    // Tactical: Some threats exist or minor material imbalance
    if (threats.length > 0 || Math.abs(materialCount.imbalance) >= 2) {
      return 'tactical';
    }

    return 'strategic';
  }

  private generateRecommendations(
    materialCount: MaterialCount, 
    threats: ThreatInfo[], 
    kingSafetyParam: PositionAnalysis['kingSafety'],
    urgencyLevel: 'emergency' | 'tactical' | 'strategic'
  ): string[] {
    const recommendations: string[] = [];
    const currentColor = this.chess.turn();
    
    // Material recommendations
    if (materialCount.imbalance < -3) {
      recommendations.push(`You're down ${Math.abs(materialCount.imbalance)} points in material - look for tactics`);
    } else if (materialCount.imbalance > 3) {
      recommendations.push(`You're up ${materialCount.imbalance} points - simplify to endgame`);
    }

    // King safety recommendations  
    const kingStatus = currentColor === 'w' ? kingSafetyParam.white : kingSafetyParam.black;
    if (!kingStatus.safe) {
      recommendations.push('Your king is under attack - prioritize king safety');
    } else if (kingStatus.castlingAvailable) {
      recommendations.push('Consider castling for king safety');
    }

    // Threat-based recommendations
    const myThreats = threats.filter(t => t.piece.startsWith(currentColor));
    if (myThreats.length > 0) {
      const hangingPieces = myThreats.filter(t => t.isHanging);
      if (hangingPieces.length > 0) {
        recommendations.push(`Save your hanging ${this.pieceTypeToName(hangingPieces[0].piece.slice(1))} on ${hangingPieces[0].square}`);
      }
    }

    // Enemy threat opportunities
    const enemyThreats = threats.filter(t => !t.piece.startsWith(currentColor));
    if (enemyThreats.length > 0) {
      const enemyHanging = enemyThreats.filter(t => t.isHanging);
      if (enemyHanging.length > 0) {
        recommendations.push(`Capture the hanging ${this.pieceTypeToName(enemyHanging[0].piece.slice(1))} on ${enemyHanging[0].square}`);
      }
    }

    return recommendations;
  }

  // Helper methods
  private indexToSquare(rank: number, file: number): Square {
    return `${String.fromCharCode(97 + file)}${8 - rank}` as Square;
  }

  private getAttackersOfSquare(square: Square, attackerColor: 'w' | 'b'): Square[] {
    const attackers: Square[] = [];
    
    // This is a simplified version - in a full implementation you'd check all piece types
    const moves = this.chess.moves({ verbose: true });
    
    for (const move of moves) {
      if (move.color === attackerColor && move.to === square) {
        attackers.push(move.from);
      }
    }
    
    return attackers;
  }

  private findKing(color: 'w' | 'b'): Square | null {
    const board = this.chess.board();
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece && piece.type === 'k' && piece.color === color) {
          return this.indexToSquare(rank, file);
        }
      }
    }
    
    return null;
  }

  private canCastle(color: 'w' | 'b'): boolean {
    const moves = this.chess.moves({ verbose: true });
    return moves.some(move => move.flags.includes('k') || move.flags.includes('q'));
  }

  private getAdjacentSquares(square: Square): Square[] {
    const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = parseInt(square[1]) - 1;   // 1=0, 2=1, etc.
    const adjacent: Square[] = [];
    
    for (let dRank = -1; dRank <= 1; dRank++) {
      for (let dFile = -1; dFile <= 1; dFile++) {
        if (dRank === 0 && dFile === 0) continue;
        
        const newRank = rank + dRank;
        const newFile = file + dFile;
        
        if (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
          adjacent.push(`${String.fromCharCode(97 + newFile)}${newRank + 1}` as Square);
        }
      }
    }
    
    return adjacent;
  }

  private pieceTypeToName(pieceType: string): string {
    const names: { [key: string]: string } = {
      'p': 'Pawn',
      'n': 'Knight', 
      'b': 'Bishop',
      'r': 'Rook',
      'q': 'Queen',
      'k': 'King'
    };
    return names[pieceType] || pieceType;
  }
}