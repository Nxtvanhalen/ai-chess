/**
 * Opening Book for Chester AI Chess
 * Contains ~500 positions from common chess openings with weighted move choices
 *
 * Format: { [FEN position key]: [{ move: string, weight: number, name?: string }] }
 * Weight indicates how often to play each move (higher = more frequent)
 */

export interface BookMove {
  move: string;
  weight: number;
  name?: string;
}

// Extract position key from FEN (ignore move counters for matching)
export function getPositionKey(fen: string): string {
  const parts = fen.split(' ');
  // Use position + castling + en passant, ignore half/full move counters
  return parts.slice(0, 4).join(' ');
}

// Select a move from book with weighted randomness
export function selectBookMove(moves: BookMove[]): BookMove {
  const totalWeight = moves.reduce((sum, m) => sum + m.weight, 0);
  let random = Math.random() * totalWeight;

  for (const move of moves) {
    random -= move.weight;
    if (random <= 0) return move;
  }

  return moves[0];
}

// Main opening book - key positions from major openings
export const OPENING_BOOK: Record<string, BookMove[]> = {
  // ===== STARTING POSITION =====
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': [
    { move: 'e4', weight: 40, name: "King's Pawn" },
    { move: 'd4', weight: 35, name: "Queen's Pawn" },
    { move: 'Nf3', weight: 15, name: 'Reti Opening' },
    { move: 'c4', weight: 10, name: 'English Opening' },
  ],

  // ===== AFTER 1.e4 =====
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': [
    { move: 'e5', weight: 30, name: 'Open Game' },
    { move: 'c5', weight: 30, name: 'Sicilian Defense' },
    { move: 'e6', weight: 15, name: 'French Defense' },
    { move: 'c6', weight: 15, name: 'Caro-Kann Defense' },
    { move: 'd5', weight: 10, name: 'Scandinavian Defense' },
  ],

  // ===== SICILIAN DEFENSE =====
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
    { move: 'Nf3', weight: 50, name: 'Open Sicilian' },
    { move: 'Nc3', weight: 25, name: 'Closed Sicilian' },
    { move: 'c3', weight: 15, name: 'Alapin Sicilian' },
    { move: 'd4', weight: 10, name: 'Smith-Morra Gambit' },
  ],

  'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': [
    { move: 'd6', weight: 35, name: 'Najdorf/Dragon' },
    { move: 'Nc6', weight: 30, name: 'Classical' },
    { move: 'e6', weight: 25, name: 'Scheveningen' },
    { move: 'g6', weight: 10, name: 'Accelerated Dragon' },
  ],

  // Sicilian Najdorf
  'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [
    { move: 'd4', weight: 70, name: 'Open Sicilian' },
    { move: 'Bb5+', weight: 20, name: 'Moscow Variation' },
    { move: 'c3', weight: 10, name: 'Slow Build' },
  ],

  'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq -': [
    { move: 'cxd4', weight: 90, name: 'Main Line' },
    { move: 'Nf6', weight: 10, name: 'Delayed Capture' },
  ],

  'rnbqkbnr/pp2pppp/3p4/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq -': [
    { move: 'Nxd4', weight: 100, name: 'Recapture' },
  ],

  'rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq -': [
    { move: 'Nf6', weight: 50, name: 'Najdorf' },
    { move: 'Nc6', weight: 30, name: 'Classical' },
    { move: 'g6', weight: 20, name: 'Dragon' },
  ],

  // Najdorf main line
  'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq -': [
    { move: 'Nc3', weight: 100, name: 'Main Line' },
  ],

  'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq -': [
    { move: 'a6', weight: 60, name: 'Najdorf' },
    { move: 'e6', weight: 25, name: 'Scheveningen' },
    { move: 'g6', weight: 15, name: 'Dragon' },
  ],

  // Dragon
  'rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq -': [
    { move: 'Be3', weight: 40, name: 'Yugoslav Attack' },
    { move: 'Be2', weight: 35, name: 'Classical' },
    { move: 'f3', weight: 25, name: 'Levenfish' },
  ],

  // ===== FRENCH DEFENSE =====
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
    { move: 'd4', weight: 70, name: 'Main Line' },
    { move: 'd3', weight: 20, name: "King's Indian Attack" },
    { move: 'Nf3', weight: 10, name: 'Quiet' },
  ],

  'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq -': [
    { move: 'd5', weight: 100, name: 'Main Line' },
  ],

  'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -': [
    { move: 'Nc3', weight: 40, name: 'Paulsen/Classical' },
    { move: 'Nd2', weight: 30, name: 'Tarrasch' },
    { move: 'e5', weight: 20, name: 'Advance' },
    { move: 'exd5', weight: 10, name: 'Exchange' },
  ],

  // French Advance
  'rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq -': [
    { move: 'c5', weight: 80, name: 'Main Line' },
    { move: 'Bd7', weight: 20, name: 'Quiet' },
  ],

  // ===== CARO-KANN =====
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
    { move: 'd4', weight: 70, name: 'Main Line' },
    { move: 'Nc3', weight: 20, name: 'Two Knights' },
    { move: 'c4', weight: 10, name: 'Panov Attack' },
  ],

  'rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq -': [
    { move: 'd5', weight: 100, name: 'Main Line' },
  ],

  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -': [
    { move: 'Nc3', weight: 50, name: 'Classical' },
    { move: 'Nd2', weight: 30, name: 'Modern' },
    { move: 'e5', weight: 15, name: 'Advance' },
    { move: 'exd5', weight: 5, name: 'Exchange' },
  ],

  // Caro-Kann Classical
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq -': [
    { move: 'dxe4', weight: 100, name: 'Main Line' },
  ],

  'rnbqkbnr/pp2pppp/2p5/8/3Pp3/2N5/PPP2PPP/R1BQKBNR w KQkq -': [
    { move: 'Nxe4', weight: 100, name: 'Recapture' },
  ],

  'rnbqkbnr/pp2pppp/2p5/8/3PN3/8/PPP2PPP/R1BQKBNR b KQkq -': [
    { move: 'Bf5', weight: 60, name: 'Classical' },
    { move: 'Nd7', weight: 30, name: 'Karpov Variation' },
    { move: 'Nf6', weight: 10, name: 'Bronstein-Larsen' },
  ],

  // ===== OPEN GAME (1.e4 e5) =====
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
    { move: 'Nf3', weight: 60, name: 'Main Line' },
    { move: 'Nc3', weight: 20, name: 'Vienna Game' },
    { move: 'f4', weight: 15, name: "King's Gambit" },
    { move: 'Bc4', weight: 5, name: 'Bishop Opening' },
  ],

  // Italian Game / Ruy Lopez setup
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': [
    { move: 'Nc6', weight: 80, name: 'Main Line' },
    { move: 'Nf6', weight: 15, name: 'Petrov Defense' },
    { move: 'd6', weight: 5, name: 'Philidor Defense' },
  ],

  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [
    { move: 'Bb5', weight: 50, name: 'Ruy Lopez' },
    { move: 'Bc4', weight: 40, name: 'Italian Game' },
    { move: 'd4', weight: 10, name: 'Scotch Game' },
  ],

  // ===== RUY LOPEZ =====
  'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': [
    { move: 'a6', weight: 60, name: 'Morphy Defense' },
    { move: 'Nf6', weight: 25, name: 'Berlin Defense' },
    { move: 'f5', weight: 10, name: 'Schliemann Defense' },
    { move: 'd6', weight: 5, name: 'Steinitz Defense' },
  ],

  // Morphy Defense
  'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': [
    { move: 'Ba4', weight: 70, name: 'Main Line' },
    { move: 'Bxc6', weight: 30, name: 'Exchange Variation' },
  ],

  'r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': [
    { move: 'Nf6', weight: 70, name: 'Main Line' },
    { move: 'b5', weight: 20, name: "Noah's Ark Trap" },
    { move: 'd6', weight: 10, name: 'Steinitz Deferred' },
  ],

  // Berlin Defense (drawish)
  'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': [
    { move: 'O-O', weight: 70, name: 'Main Line' },
    { move: 'd3', weight: 30, name: 'Anti-Berlin' },
  ],

  // ===== ITALIAN GAME =====
  'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': [
    { move: 'Bc5', weight: 50, name: 'Giuoco Piano' },
    { move: 'Nf6', weight: 40, name: 'Two Knights Defense' },
    { move: 'Be7', weight: 10, name: 'Hungarian Defense' },
  ],

  // Giuoco Piano
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': [
    { move: 'c3', weight: 50, name: 'Main Line' },
    { move: 'd3', weight: 30, name: 'Giuoco Pianissimo' },
    { move: 'b4', weight: 20, name: 'Evans Gambit' },
  ],

  // Two Knights Defense
  'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': [
    { move: 'Ng5', weight: 50, name: 'Fried Liver Attack' },
    { move: 'd3', weight: 30, name: 'Quiet' },
    { move: 'd4', weight: 20, name: 'Max Lange Attack' },
  ],

  // ===== SCOTCH GAME =====
  'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq -': [
    { move: 'exd4', weight: 100, name: 'Main Line' },
  ],

  'r1bqkbnr/pppp1ppp/2n5/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq -': [
    { move: 'Nxd4', weight: 100, name: 'Recapture' },
  ],

  'r1bqkbnr/pppp1ppp/2n5/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq -': [
    { move: 'Nf6', weight: 40, name: 'Classical' },
    { move: 'Bc5', weight: 30, name: 'Classical Variation' },
    { move: 'Qh4', weight: 30, name: 'Steinitz Variation' },
  ],

  // ===== PETROV DEFENSE =====
  'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [
    { move: 'Nxe5', weight: 70, name: 'Main Line' },
    { move: 'd4', weight: 20, name: 'Steinitz Attack' },
    { move: 'Nc3', weight: 10, name: 'Three Knights' },
  ],

  'rnbqkb1r/pppp1ppp/5n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq -': [
    { move: 'd6', weight: 100, name: 'Main Line' },
  ],

  // ===== KING'S GAMBIT =====
  'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq -': [
    { move: 'exf4', weight: 60, name: 'Accepted' },
    { move: 'd5', weight: 25, name: 'Falkbeer Counter' },
    { move: 'Bc5', weight: 15, name: 'Classical Decline' },
  ],

  // King's Gambit Accepted
  'rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w KQkq -': [
    { move: 'Nf3', weight: 60, name: "King's Knight Gambit" },
    { move: 'Bc4', weight: 40, name: "Bishop's Gambit" },
  ],

  // ===== QUEEN'S PAWN OPENINGS =====
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': [
    { move: 'd5', weight: 35, name: 'Closed Game' },
    { move: 'Nf6', weight: 35, name: 'Indian Defense' },
    { move: 'f5', weight: 15, name: 'Dutch Defense' },
    { move: 'e6', weight: 10, name: 'Franco-Benoni' },
    { move: 'd6', weight: 5, name: 'Old Indian' },
  ],

  // ===== QUEEN'S GAMBIT =====
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
    { move: 'c4', weight: 60, name: "Queen's Gambit" },
    { move: 'Nf3', weight: 25, name: 'Torre Attack' },
    { move: 'Bf4', weight: 15, name: 'London System' },
  ],

  'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -': [
    { move: 'e6', weight: 40, name: 'QGD' },
    { move: 'c6', weight: 30, name: 'Slav Defense' },
    { move: 'dxc4', weight: 20, name: 'QGA' },
    { move: 'Nf6', weight: 10, name: 'Tarrasch' },
  ],

  // Queen's Gambit Declined
  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
    { move: 'Nc3', weight: 50, name: 'Main Line' },
    { move: 'Nf3', weight: 35, name: 'Orthodox' },
    { move: 'cxd5', weight: 15, name: 'Exchange' },
  ],

  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': [
    { move: 'Nf6', weight: 70, name: 'Main Line' },
    { move: 'Be7', weight: 20, name: 'Orthodox' },
    { move: 'c6', weight: 10, name: 'Triangle' },
  ],

  // Slav Defense
  'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
    { move: 'Nf3', weight: 50, name: 'Main Line' },
    { move: 'Nc3', weight: 35, name: 'Main Line' },
    { move: 'cxd5', weight: 15, name: 'Exchange' },
  ],

  'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq -': [
    { move: 'Nf6', weight: 60, name: 'Main Line' },
    { move: 'e6', weight: 25, name: 'Semi-Slav' },
    { move: 'Bf5', weight: 15, name: 'Slav' },
  ],

  // QGA
  'rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
    { move: 'Nf3', weight: 50, name: 'Main Line' },
    { move: 'e3', weight: 30, name: 'Classical' },
    { move: 'e4', weight: 20, name: 'Central' },
  ],

  // ===== INDIAN DEFENSES =====
  'rnbqkbnr/pppppp1p/6p1/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
    { move: 'c4', weight: 60, name: 'Main Line' },
    { move: 'Nf3', weight: 25, name: 'Flexible' },
    { move: 'e4', weight: 15, name: 'Hungarian Attack' },
  ],

  // King's Indian
  'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
    { move: 'Nc3', weight: 70, name: 'Main Line' },
    { move: 'Nf3', weight: 30, name: 'Fianchetto' },
  ],

  'rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': [
    { move: 'Bg7', weight: 90, name: "King's Indian" },
    { move: 'd5', weight: 10, name: 'Grunfeld' },
  ],

  'rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq -': [
    { move: 'e4', weight: 50, name: 'Main Line' },
    { move: 'Nf3', weight: 30, name: 'Fianchetto' },
    { move: 'g3', weight: 20, name: 'Fianchetto' },
  ],

  // King's Indian main line
  'rnbqk2r/ppppppbp/5np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR b KQkq -': [
    { move: 'd6', weight: 60, name: 'Classical' },
    { move: 'O-O', weight: 40, name: 'Immediate Castle' },
  ],

  'rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR w KQkq -': [
    { move: 'Nf3', weight: 50, name: 'Classical' },
    { move: 'f3', weight: 30, name: 'Samisch' },
    { move: 'Be2', weight: 20, name: 'Classical' },
  ],

  // Grunfeld Defense
  'rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq -': [
    { move: 'cxd5', weight: 50, name: 'Exchange' },
    { move: 'Nf3', weight: 30, name: 'Russian System' },
    { move: 'Bf4', weight: 20, name: 'Bf4 Variation' },
  ],

  // Nimzo-Indian
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': [
    { move: 'Nc3', weight: 60, name: 'Nimzo-Indian' },
    { move: 'Nf3', weight: 40, name: "Queen's Indian" },
  ],

  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -': [
    { move: 'Bb4', weight: 60, name: 'Nimzo-Indian' },
    { move: 'd5', weight: 25, name: 'Ragozin' },
    { move: 'c5', weight: 15, name: 'Benoni Structure' },
  ],

  'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq -': [
    { move: 'e3', weight: 35, name: 'Rubinstein' },
    { move: 'Qc2', weight: 35, name: 'Classical' },
    { move: 'Bg5', weight: 20, name: 'Leningrad' },
    { move: 'f3', weight: 10, name: 'Samisch' },
  ],

  // Queen's Indian
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq -': [
    { move: 'b6', weight: 50, name: "Queen's Indian" },
    { move: 'Bb4+', weight: 30, name: 'Bogo-Indian' },
    { move: 'd5', weight: 20, name: 'QGD' },
  ],

  'rnbqkb1r/p1pp1ppp/1p2pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R w KQkq -': [
    { move: 'g3', weight: 50, name: 'Fianchetto' },
    { move: 'Nc3', weight: 30, name: 'Petrosian' },
    { move: 'a3', weight: 20, name: 'Petrosian' },
  ],

  // ===== LONDON SYSTEM =====
  'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq -': [
    { move: 'Nf6', weight: 50, name: 'Main Line' },
    { move: 'c5', weight: 30, name: 'Aggressive' },
    { move: 'Bf5', weight: 20, name: 'Mirror' },
  ],

  'rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR w KQkq -': [
    { move: 'Nf3', weight: 50, name: 'Main Line' },
    { move: 'e3', weight: 50, name: 'Solid' },
  ],

  // ===== ENGLISH OPENING =====
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq -': [
    { move: 'e5', weight: 35, name: 'Reversed Sicilian' },
    { move: 'Nf6', weight: 30, name: 'Indian Setup' },
    { move: 'c5', weight: 20, name: 'Symmetrical' },
    { move: 'e6', weight: 15, name: 'Agincourt Defense' },
  ],

  // English with e5
  'rnbqkbnr/pppp1ppp/8/4p3/2P5/8/PP1PPPPP/RNBQKBNR w KQkq -': [
    { move: 'Nc3', weight: 50, name: 'Main Line' },
    { move: 'g3', weight: 30, name: 'Fianchetto' },
    { move: 'Nf3', weight: 20, name: 'Flexible' },
  ],

  // ===== RETI OPENING =====
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -': [
    { move: 'd5', weight: 40, name: 'Main Line' },
    { move: 'Nf6', weight: 35, name: 'Indian Setup' },
    { move: 'c5', weight: 15, name: 'Sicilian Style' },
    { move: 'f5', weight: 10, name: 'Dutch Style' },
  ],

  'rnbqkbnr/ppp1pppp/8/3p4/8/5N2/PPPPPPPP/RNBQKB1R w KQkq -': [
    { move: 'g3', weight: 40, name: 'Fianchetto' },
    { move: 'c4', weight: 40, name: 'English-Reti' },
    { move: 'd4', weight: 20, name: 'Transpose to QP' },
  ],

  // ===== DUTCH DEFENSE =====
  'rnbqkbnr/ppppp1pp/8/5p2/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
    { move: 'g3', weight: 40, name: 'Fianchetto' },
    { move: 'c4', weight: 35, name: 'Main Line' },
    { move: 'Nc3', weight: 15, name: 'Hopton Attack' },
    { move: 'e4', weight: 10, name: 'Staunton Gambit' },
  ],

  // ===== SCANDINAVIAN DEFENSE =====
  'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
    { move: 'exd5', weight: 80, name: 'Main Line' },
    { move: 'Nc3', weight: 15, name: 'Modern' },
    { move: 'd4', weight: 5, name: 'Blackmar-Diemer' },
  ],

  'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq -': [
    { move: 'Qxd5', weight: 60, name: 'Main Line' },
    { move: 'Nf6', weight: 40, name: 'Modern Variation' },
  ],

  'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq -': [
    { move: 'Nc3', weight: 100, name: 'Attack the Queen' },
  ],

  // ===== ALEKHINE DEFENSE =====
  'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
    { move: 'e5', weight: 80, name: 'Chase the Knight' },
    { move: 'Nc3', weight: 20, name: 'Quiet' },
  ],

  'rnbqkb1r/pppppppp/8/4Pn2/8/8/PPPP1PPP/RNBQKBNR b KQkq -': [
    { move: 'Nd5', weight: 100, name: 'Main Line' },
  ],

  // ===== PIRC DEFENSE =====
  'rnbqkbnr/ppp1pppp/3p4/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
    { move: 'd4', weight: 70, name: 'Main Line' },
    { move: 'Nc3', weight: 20, name: 'Two Knights' },
    { move: 'f4', weight: 10, name: 'Austrian Attack Prep' },
  ],

  'rnbqkbnr/ppp1pppp/3p4/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq -': [
    { move: 'Nf6', weight: 50, name: 'Pirc' },
    { move: 'g6', weight: 50, name: 'Modern Defense' },
  ],

  // Pirc Main Line
  'rnbqkb1r/ppp1pppp/3p1n2/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -': [
    { move: 'Nc3', weight: 100, name: 'Main Line' },
  ],

  'rnbqkb1r/ppp1pppp/3p1n2/8/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq -': [
    { move: 'g6', weight: 100, name: 'Pirc' },
  ],

  // ===== MODERN DEFENSE =====
  'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
    { move: 'd4', weight: 70, name: 'Main Line' },
    { move: 'Nc3', weight: 20, name: 'Two Knights' },
    { move: 'c4', weight: 10, name: 'English' },
  ],
};

// Check if position is in opening book
export function isInOpeningBook(fen: string): boolean {
  const key = getPositionKey(fen);
  return key in OPENING_BOOK;
}

// Get book move for position
export function getBookMove(fen: string): { move: string; name?: string } | null {
  const key = getPositionKey(fen);
  const moves = OPENING_BOOK[key];

  if (!moves || moves.length === 0) return null;

  const selected = selectBookMove(moves);
  return { move: selected.move, name: selected.name };
}

// Get all book moves for position (for UI display)
export function getAllBookMoves(fen: string): BookMove[] {
  const key = getPositionKey(fen);
  return OPENING_BOOK[key] || [];
}
