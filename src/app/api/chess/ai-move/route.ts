import { createServerClient } from '@supabase/ssr';
import { Chess } from 'chess.js';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { EnhancedChessEngine } from '@/lib/chess/engineEnhanced';
import { checkRateLimitRedis, getClientIPFromRequest, getRateLimitHeadersRedis } from '@/lib/redis';
import {
  canUseAIMove,
  createUsageLimitError,
  getUserTier,
  getUsageHeaders,
  incrementAIMoveUsage,
} from '@/lib/supabase/subscription';
import { aiMoveSchema, validateRequest } from '@/lib/validation/schemas';

// Singleton engine instance for API route (maintains transposition table)
let engineInstance: EnhancedChessEngine | null = null;

function getEngine(): EnhancedChessEngine {
  if (!engineInstance) {
    engineInstance = new EnhancedChessEngine();
  }
  return engineInstance;
}

export async function POST(request: NextRequest) {
  const requestStart = Date.now();
  try {
    // Check rate limit (Redis-based, falls back to in-memory)
    const clientIP = getClientIPFromRequest(request);
    const rateLimitResult = await checkRateLimitRedis(clientIP, 'aiMove');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait before requesting another AI move.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: getRateLimitHeadersRedis(rateLimitResult),
        },
      );
    }

    // Get authenticated user for subscription check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Server Component context
            }
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check subscription usage limit (only for authenticated users with subscriptions)
    let usageCheck: {
      allowed: boolean;
      balance: number;
      unlimited: boolean;
    } | null = null;
    if (user) {
      usageCheck = await canUseAIMove(user.id);
      if (!usageCheck.allowed) {
        const tier = await getUserTier(user.id);
        return NextResponse.json(createUsageLimitError('ai_move', usageCheck, tier), {
          status: 429,
          headers: getUsageHeaders('ai_move', usageCheck),
        });
      }
    }

    const body = await request.json();

    // Validate input with Zod schema
    const validation = validateRequest(aiMoveSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { fen, difficulty, playerMoveHistory, newGame } = validation.data;

    const engine = getEngine();

    // Clear transposition table for new games
    if (newGame) {
      engine.clearTranspositionTable();
    }

    // Validate the position
    const chess = new Chess(fen);
    if (!chess.isGameOver() && chess.turn() === 'b') {
      const engineStart = Date.now();
      const result = engine.getBestMove(
        fen,
        difficulty as 'easy' | 'medium' | 'hard',
        playerMoveHistory,
      );
      console.log(`[AI-Move] Engine computation: ${Date.now() - engineStart}ms`);

      if (result) {
        // Apply the move to get the new position
        let move;
        try {
          move = chess.move(result.move);
        } catch (moveError) {
          console.error('[AI-Move] Engine returned invalid move:', result.move, moveError);
          return NextResponse.json({ error: 'Engine produced an invalid move' }, { status: 500 });
        }

        // Increment usage counter for authenticated users
        if (user) {
          await incrementAIMoveUsage(user.id);
        }

        // Build response with usage headers
        const responseHeaders: Record<string, string> = {};
        if (usageCheck) {
          Object.assign(
            responseHeaders,
            getUsageHeaders('ai_move', {
              balance: usageCheck.unlimited ? -1 : Math.max(0, usageCheck.balance - 1),
              unlimited: usageCheck.unlimited,
            }),
          );
        }

        console.log(`[AI-Move] Total request time: ${Date.now() - requestStart}ms`);
        return NextResponse.json(
          {
            move: result.move,
            san: move.san,
            fen: chess.fen(),
            from: move.from,
            to: move.to,
            // Enhanced analysis data
            analysis: {
              evaluation: result.evaluation,
              depth: result.depth,
              thinkingTime: result.thinkingTime,
              analysis: result.analysis,
              // New enhanced data
              fromBook: result.fromBook,
              nodesSearched: result.nodesSearched,
              ttHitRate: result.ttHitRate,
            },
          },
          { headers: responseHeaders },
        );
      }
    }

    console.log(`[AI-Move] No valid move, total time: ${Date.now() - requestStart}ms`);
    return NextResponse.json({ error: 'No valid move found' }, { status: 400 });
  } catch (error) {
    console.error('[AI-Move] Error:', error);
    return NextResponse.json({ error: 'Failed to generate AI move' }, { status: 500 });
  }
}
