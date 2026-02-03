import { z } from 'zod';

// FEN validation regex - validates basic FEN structure
const _fenRegex =
  /^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+ [wb] (-|K?Q?k?q?) (-|[a-h][36]) \d+ \d+$/;

// Chess square validation
const squareRegex = /^[a-h][1-8]$/;

// SAN move validation (loose - allows most algebraic notation)
const _sanRegex = /^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?$|^O-O(-O)?[+#]?$/;

// Difficulty levels
const difficultySchema = z.enum(['easy', 'medium', 'hard']).default('medium');

// Piece types
const pieceSchema = z.enum(['p', 'n', 'b', 'r', 'q', 'k', 'P', 'N', 'B', 'R', 'Q', 'K']).optional();

// Player type
const playerTypeSchema = z.enum(['human', 'ai']).default('human');

// FEN string schema with validation
export const fenSchema = z
  .string()
  .min(10, 'FEN string too short')
  .max(100, 'FEN string too long')
  .refine((fen) => {
    // Basic structure check - 6 parts separated by spaces
    const parts = fen.split(' ');
    if (parts.length !== 6) return false;

    // Check board has 8 ranks
    const ranks = parts[0].split('/');
    if (ranks.length !== 8) return false;

    // Check turn is 'w' or 'b'
    if (parts[1] !== 'w' && parts[1] !== 'b') return false;

    return true;
  }, 'Invalid FEN format');

// Move details schema
export const moveDetailsSchema = z
  .object({
    san: z.string().max(10).optional(),
    from: z.string().regex(squareRegex, 'Invalid source square').optional(),
    to: z.string().regex(squareRegex, 'Invalid target square').optional(),
    piece: pieceSchema,
    captured: pieceSchema,
    player_type: playerTypeSchema,
    evaluation: z.number().optional(),
  })
  .optional();

// AI Move endpoint schema
export const aiMoveSchema = z.object({
  fen: fenSchema,
  difficulty: difficultySchema,
  playerMoveHistory: z.array(z.string().max(10)).max(500).default([]),
  newGame: z.boolean().default(false),
});

// Game context schema for move/chat endpoints
export const gameContextSchema = z
  .object({
    fen: z.string().optional(),
    lastMove: z.string().max(10).optional(),
    totalMoves: z.number().int().min(0).max(1000).optional(),
    fullMoveHistory: z.array(z.any()).max(500).optional(),
  })
  .optional();

// Move history item for chat context
const chatMoveHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant', 'engine']).optional(),
  content: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Chess move endpoint schema
export const chessMoveSchema = z.object({
  move: z.string().min(2).max(10),
  fen: fenSchema,
  moveHistory: z.array(chatMoveHistoryItemSchema).max(500).optional(),
  gameContext: gameContextSchema,
  gameId: z.string().uuid().optional(),
  userId: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .transform((v) => v ?? 'anonymous'),
  moveDetails: moveDetailsSchema,
});

// Chat endpoint schema
export const chatSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long (max 2000 characters)'),
  gameContext: gameContextSchema,
  moveHistory: z.array(chatMoveHistoryItemSchema).max(500).optional(),
  gameId: z.string().uuid().optional(),
  userId: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .transform((v) => v ?? 'anonymous'),
});

// Pre-move analysis endpoint schema
export const preMoveAnalysisSchema = z.object({
  fen: fenSchema,
  moveHistory: z.array(z.string().max(10)).max(500).optional(),
  gamePhase: z.enum(['opening', 'middlegame', 'endgame']).optional(),
  gameContext: gameContextSchema,
  gameId: z.string().uuid().optional(),
  userId: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .transform((v) => v ?? 'anonymous'),
});

// Engine move analysis schema (for AI opponent move commentary)
export const engineMoveAnalysisSchema = z.object({
  engineMove: z.union([
    z.string().min(2).max(10),
    z.object({
      san: z.string().max(10).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  ]),
  fen: fenSchema,
  engineEvaluation: z.number().optional(),
  alternatives: z.array(z.any()).optional(),
});

// Type exports for use in API routes
export type AiMoveInput = z.infer<typeof aiMoveSchema>;
export type ChessMoveInput = z.infer<typeof chessMoveSchema>;
export type ChatInput = z.infer<typeof chatSchema>;
export type PreMoveAnalysisInput = z.infer<typeof preMoveAnalysisSchema>;
export type EngineMoveAnalysisInput = z.infer<typeof engineMoveAnalysisSchema>;

// Validation helper that returns formatted error response
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: `Validation failed: ${errors}` };
  }

  return { success: true, data: result.data };
}
