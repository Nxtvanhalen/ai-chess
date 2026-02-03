import { type NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getUser';
import { CHESS_BUTLER_SYSTEM_PROMPT } from '@/lib/openai/chess-butler-prompt';
import { createResponsesCompletion } from '@/lib/openai/client';
import { checkRateLimitRedis, getClientIPFromRequest, getRateLimitHeadersRedis } from '@/lib/redis';
import { ChesterMemoryService } from '@/lib/services/ChesterMemoryService';
import { GameMemoryService } from '@/lib/services/GameMemoryService';
import { chessMoveSchema, validateRequest } from '@/lib/validation/schemas';

const MOVE_ANALYSIS_PROMPT = `
You are Chester analyzing a move. Provide brief but insightful commentary on:
1. The strategic merit of the move
2. What it accomplishes tactically
3. Any potential concerns or better alternatives
4. Brief advice for the next phase

CRITICAL: Always spell out chess moves in plain English (e.g., "Knight to D3" instead of "Nd3", "Queen to E5" instead of "Qe5"). Never use algebraic notation when discussing moves.

Keep your response conversational, under 100 words, and maintain your dignified personality as Chester.
`;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let clientIP = 'unknown';

  try {
    // Check rate limit (Redis-based, falls back to in-memory)
    clientIP = getClientIPFromRequest(request);
    const rateLimitResult = await checkRateLimitRedis(clientIP, 'moveAnalysis');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait before requesting move analysis.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: getRateLimitHeadersRedis(rateLimitResult),
        },
      );
    }

    const body = await request.json();

    // Validate input with Zod schema
    const validation = validateRequest(chessMoveSchema, body);
    if (!validation.success) {
      console.error('Move API - Validation failed:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { move, fen, moveHistory, gameContext, gameId, moveDetails } = validation.data;

    // Get authenticated user, fall back to null for unauthenticated requests
    const authUser = await getAuthenticatedUser();
    const userId = authUser?.id || null;

    console.log('Move API - Processing move:', {
      move,
      hasGameId: !!gameId,
      hasMoveDetails: !!moveDetails,
      totalMoves: gameContext?.totalMoves,
      moveHistoryLength: moveHistory?.length || 0,
      fullMoveHistoryLength: gameContext?.fullMoveHistory?.length || 0,
    });

    // Fetch comprehensive game memory context with timeout
    let fullGameContext = null;
    let chesterPersonality = null;

    if (gameId) {
      try {
        // Add timeout to database calls (5 seconds)
        const dbTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database timeout after 5s')), 5000),
        );

        const contextPromise = GameMemoryService.getGameContext(gameId);
        const personalityPromise = ChesterMemoryService.getPersonalityContext(userId);

        fullGameContext = (await Promise.race([contextPromise, dbTimeout])) as any;
        chesterPersonality = (await Promise.race([personalityPromise, dbTimeout])) as any;

        console.log('Move API - Memory context loaded:', {
          totalMovesInMemory: fullGameContext?.totalMoves || 0,
          tacticalThemes: fullGameContext?.tacticalThemes || [],
          loadTime: Date.now() - startTime,
        });
      } catch (error) {
        console.error('Error fetching game memory (continuing with degraded context):', error);
        // Continue without memory - graceful degradation
        fullGameContext = null;
        chesterPersonality = null;
      }
    }

    // Build context
    const messages: any[] = [
      { role: 'system', content: CHESS_BUTLER_SYSTEM_PROMPT },
      { role: 'system', content: MOVE_ANALYSIS_PROMPT },
      { role: 'system', content: `Current position (FEN): ${fen}` },
      { role: 'user', content: `I just played ${move}. What do you think of this move?` },
    ];

    // Add comprehensive game context
    if (gameContext?.fullMoveHistory && gameContext.fullMoveHistory.length > 0) {
      const moveSequence = gameContext.fullMoveHistory
        .map((m: any) => {
          // Ensure move is a string, not an object
          const moveStr = typeof m.move === 'string' ? m.move : m.move?.san || String(m.move);
          return `${m.role === 'user' ? 'Player' : 'AI'}: ${moveStr}`;
        })
        .join(', ');

      messages.splice(-1, 0, {
        role: 'system',
        content: `Complete game move history: ${moveSequence}
        
        Use this full context to provide accurate strategic analysis of the player's move considering:
        - The opening progression and development patterns
        - Previous tactical sequences and their outcomes
        - The overall strategic direction of the game
        - How this move fits into the broader game plan`,
      });
    } else if (moveHistory && moveHistory.length > 0) {
      // Fallback to limited context if full history not available
      const recentMoves = moveHistory
        .map((m: any) => {
          const moveCtx = m.metadata?.moveContext;
          // Ensure moveContext is a string
          return typeof moveCtx === 'string' ? moveCtx : moveCtx?.san || String(moveCtx);
        })
        .filter(Boolean)
        .join(', ');
      messages.splice(-1, 0, {
        role: 'system',
        content: `Recent moves: ${recentMoves}`,
      });
    }

    // Build comprehensive instructions for Responses API
    let instructions = `${CHESS_BUTLER_SYSTEM_PROMPT}\n\n${MOVE_ANALYSIS_PROMPT}`;
    instructions += `\nCurrent position (FEN): ${fen}`;

    // Add Chester's personality context
    if (chesterPersonality) {
      instructions += `\n\nYour relationship with the player:
- Rapport Level: ${chesterPersonality.rapportLevel}/10
- Games Together: ${chesterPersonality.gamesPlayed}
- Recent Performance: ${chesterPersonality.recentPerformance}`;
    }

    // Add comprehensive game memory context (limit to last 30 moves to prevent payload bloat)
    const MAX_MOVES_IN_CONTEXT = 30;

    if (fullGameContext && fullGameContext.fullMoveHistory.length > 0) {
      const recentMoves = fullGameContext.fullMoveHistory.slice(-MAX_MOVES_IN_CONTEXT);
      const moveSequence = recentMoves
        .map(
          (m: any) =>
            `${m.move_number}. ${m.player_type === 'human' ? 'Player' : 'AI'}: ${m.san}${m.captured ? ` (x${m.captured})` : ''}`,
        )
        .join(', ');

      const isFullHistory = fullGameContext.fullMoveHistory.length <= MAX_MOVES_IN_CONTEXT;
      instructions += `\n\n${isFullHistory ? 'Complete' : 'Recent'} game move history (${recentMoves.length} moves): ${moveSequence}`;

      // Add tactical themes
      if (fullGameContext.tacticalThemes.length > 0) {
        instructions += `\nTactical themes so far: ${fullGameContext.tacticalThemes.join(', ')}`;
      }

      // Add recent commentary for context
      const recentCommentary = fullGameContext.chesterCommentary.slice(-3);
      if (recentCommentary.length > 0) {
        instructions += `\nYour recent commentary:`;
        recentCommentary.forEach((c: any) => {
          instructions += `\n- Move ${c.move_number}: ${c.content}`;
        });
      }

      instructions += `\n\nUse this context to provide accurate strategic analysis considering:
      - The opening progression and development patterns
      - Previous tactical sequences and their outcomes
      - The overall strategic direction of the game
      - How this move fits into the broader game plan
      - Patterns you've previously noticed`;
    } else if (gameContext?.fullMoveHistory && gameContext.fullMoveHistory.length > 0) {
      // Fallback to gameContext if game memory not available (also limit to last 30)
      const recentMoves = gameContext.fullMoveHistory.slice(-MAX_MOVES_IN_CONTEXT);
      const moveSequence = recentMoves
        .map((m: any) => {
          // Ensure move is a string, not an object
          const moveStr = typeof m.move === 'string' ? m.move : m.move?.san || String(m.move);
          return `${m.role === 'user' ? 'Player' : 'AI'}: ${moveStr}`;
        })
        .join(', ');

      const isFullHistory = gameContext.fullMoveHistory.length <= MAX_MOVES_IN_CONTEXT;
      instructions += `\n\n${isFullHistory ? 'Complete' : 'Recent'} game move history (${recentMoves.length} moves): ${moveSequence}

      Use this context to provide accurate strategic analysis of the player's move considering:
      - The opening progression and development patterns
      - Previous tactical sequences and their outcomes
      - The overall strategic direction of the game
      - How this move fits into the broader game plan`;
    } else if (moveHistory && moveHistory.length > 0) {
      // Fallback to limited context if full history not available
      const recentMoves = moveHistory.slice(-15);
      const recentMovesText = recentMoves
        .map((m: any) => {
          const moveCtx = m.metadata?.moveContext;
          // Ensure moveContext is a string
          return typeof moveCtx === 'string' ? moveCtx : moveCtx?.san || String(moveCtx);
        })
        .filter(Boolean) // Remove any undefined/null values
        .join(', ');
      instructions += `\n\nRecent moves: ${recentMovesText}`;
    }

    // Call OpenAI with error handling
    let content = '';
    try {
      console.log('Move API - Calling OpenAI Responses API...');
      const aiStartTime = Date.now();

      const completion = await createResponsesCompletion({
        model: 'gpt-5.2-2025-12-11',
        input: `I just played ${move}. React briefly.`,
        instructions:
          instructions +
          `\n\nREMEMBER: Keep your reaction to 1 sentence, maybe 2 if critical. Be witty, not eager. Examples: "Solid.", "That's brave.", "Engine won't like that.", "Interesting choice.", "Trading queens already?"`,
        reasoning: {
          effort: 'low', // Fast move analysis
        },
        max_output_tokens: 100, // Reduced for brevity
      });

      const aiDuration = Date.now() - aiStartTime;
      console.log(`Move API - OpenAI responded in ${aiDuration}ms`);

      // Parse Responses API format
      const messageOutput = completion.output.find((item: any) => item.type === 'message');
      const textContent = messageOutput?.content.find(
        (content: any) => content.type === 'output_text',
      );
      content = textContent?.text || 'Interesting move.';
    } catch (aiError: any) {
      console.error('Move API - OpenAI API error:', {
        error: aiError.message,
        status: aiError.status,
        code: aiError.code,
        duration: Date.now() - startTime,
      });

      // Provide fallback commentary based on move type
      content = 'Noted.';
    }

    // Save move and commentary to game memory (non-blocking - don't wait for completion)
    if (gameId && moveDetails) {
      const moveNumber = gameContext?.totalMoves || 1;

      // Fire and forget - save in background
      (async () => {
        try {
          // Save the move to game memory
          await GameMemoryService.addMove(gameId, {
            move_number: moveNumber,
            san: moveDetails.san || move,
            from: moveDetails.from || '',
            to: moveDetails.to || '',
            piece: moveDetails.piece || '',
            captured: moveDetails.captured,
            fen_after: fen,
            timestamp: new Date().toISOString(),
            player_type: moveDetails.player_type || 'human',
            evaluation: moveDetails.evaluation,
          });

          // Save Chester's commentary
          await GameMemoryService.addCommentary(gameId, {
            move_number: moveNumber,
            type: 'post_move',
            content: content,
            timestamp: new Date().toISOString(),
            metadata: {},
          });

          // Detect and save tactical themes from commentary
          const tacticalKeywords = {
            fork: 'fork',
            pin: 'pin',
            skewer: 'skewer',
            discovery: 'discovered_attack',
            sacrifice: 'sacrifice',
            'mate threat': 'mate_threat',
            zugzwang: 'zugzwang',
            overload: 'overload',
            deflection: 'deflection',
            decoy: 'decoy',
          };

          const lowercaseContent = content.toLowerCase();
          for (const [keyword, theme] of Object.entries(tacticalKeywords)) {
            if (lowercaseContent.includes(keyword)) {
              await GameMemoryService.addTacticalTheme(gameId, theme);
            }
          }

          console.log('Move and commentary saved to game memory');
        } catch (error) {
          console.error('Error saving to game memory (background):', error);
          // This is non-blocking, so we just log the error
        }
      })();
    }

    const totalDuration = Date.now() - startTime;
    console.log(`Move API - Total request duration: ${totalDuration}ms`);

    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'X-Response-Time': `${totalDuration}ms`,
      },
    });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error('Move analysis error:', {
      error: error.message,
      stack: error.stack,
      duration: totalDuration,
      clientIP,
    });

    // Return a friendly error message
    return NextResponse.json(
      {
        error: 'Failed to analyze move',
        message: error.message || 'Unknown error',
        retryable: true,
      },
      { status: 500 },
    );
  }
}
