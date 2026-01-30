import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { EnhancedChessEngine } from '@/lib/chess/engineEnhanced';
import { Chess } from 'chess.js';
import { aiMoveSchema, validateRequest } from '@/lib/validation/schemas';
import { checkRateLimitRedis, getRateLimitHeadersRedis, getClientIPFromRequest } from '@/lib/redis';
import { canUseAIMove, incrementAIMoveUsage, createUsageLimitError, getUsageHeaders } from '@/lib/supabase/subscription';

// Singleton engine instance for API route (maintains transposition table)
let engineInstance: EnhancedChessEngine | null = null;

function getEngine(): EnhancedChessEngine {
  if (!engineInstance) {
    engineInstance = new EnhancedChessEngine();
    console.log('[AI Move API] Enhanced engine initialized with opening book + transposition table');
  }
  return engineInstance;
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit (Redis-based, falls back to in-memory)
    const clientIP = getClientIPFromRequest(request);
    const rateLimitResult = await checkRateLimitRedis(clientIP, 'aiMove');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait before requesting another AI move.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: getRateLimitHeadersRedis(rateLimitResult)
        }
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
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Check subscription usage limit (only for authenticated users with subscriptions)
    let usageCheck: { allowed: boolean; remaining: number; limit: number; unlimited: boolean } | null = null;
    if (user) {
      usageCheck = await canUseAIMove(user.id);
      if (!usageCheck.allowed) {
        return NextResponse.json(
          createUsageLimitError('ai_move', usageCheck),
          {
            status: 429,
            headers: getUsageHeaders('ai_move', usageCheck)
          }
        );
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
      console.log('[AI Move API] Transposition table cleared for new game');
    }

    // Validate the position
    const chess = new Chess(fen);
    if (!chess.isGameOver() && chess.turn() === 'b') {
      const result = engine.getBestMove(
        fen,
        difficulty as 'easy' | 'medium' | 'hard',
        playerMoveHistory
      );

      if (result) {
        // Apply the move to get the new position
        const move = chess.move(result.move);

        // Log enhanced stats
        console.log('[AI Move API] Engine result:', {
          move: result.move,
          depth: result.depth,
          fromBook: result.fromBook,
          nodesSearched: result.nodesSearched,
          ttHitRate: `${(result.ttHitRate * 100).toFixed(1)}%`,
          thinkingTime: `${result.thinkingTime}ms`
        });

        // Increment usage counter for authenticated users
        if (user) {
          await incrementAIMoveUsage(user.id);
        }

        // Build response with usage headers
        const responseHeaders: Record<string, string> = {};
        if (usageCheck) {
          Object.assign(responseHeaders, getUsageHeaders('ai_move', {
            remaining: usageCheck.unlimited ? Infinity : usageCheck.remaining - 1,
            limit: usageCheck.limit,
            unlimited: usageCheck.unlimited
          }));
        }

        return NextResponse.json({
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
            ttHitRate: result.ttHitRate
          }
        }, { headers: responseHeaders });
      }
    }

    return NextResponse.json({ error: 'No valid move found' }, { status: 400 });
  } catch (error) {
    console.error('AI move error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI move' },
      { status: 500 }
    );
  }
}