import { type NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getUser';
import { extractMoveSuggestions, validateMoveSuggestion } from '@/lib/chess/board-validator';
import { CHESS_BUTLER_SYSTEM_PROMPT, formatMoveContext } from '@/lib/openai/chess-butler-prompt';
import { createResponsesCompletion } from '@/lib/openai/client';
import { checkRateLimitRedis, getClientIPFromRequest, getRateLimitHeadersRedis } from '@/lib/redis';
import { ChesterMemoryService } from '@/lib/services/ChesterMemoryService';
import { GameMemoryService } from '@/lib/services/GameMemoryService';
import {
  canUseChat,
  createUsageLimitError,
  getUsageHeaders,
  incrementChatUsage,
} from '@/lib/supabase/subscription';
import { chatSchema, validateRequest } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit (Redis-based, falls back to in-memory)
    const clientIP = getClientIPFromRequest(request);
    const rateLimitResult = await checkRateLimitRedis(clientIP, 'chat');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait before sending another message.',
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
    const validation = validateRequest(chatSchema, body);
    if (!validation.success) {
      console.error('Chat API - Validation failed:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { message, gameContext, moveHistory, gameId } = validation.data;

    // Get authenticated user, fall back to null for unauthenticated requests
    const authUser = await getAuthenticatedUser();
    const userId = authUser?.id || null;

    // Check subscription usage limit (only for authenticated users with subscriptions)
    let usageCheck: {
      allowed: boolean;
      remaining: number;
      limit: number;
      unlimited: boolean;
    } | null = null;
    if (authUser) {
      usageCheck = await canUseChat(authUser.id);
      if (!usageCheck.allowed) {
        return NextResponse.json(createUsageLimitError('chat', usageCheck), {
          status: 429,
          headers: getUsageHeaders('chat', usageCheck),
        });
      }
    }

    // Debug: Log game context to help troubleshoot Chester's board visibility
    console.log('Chester Chat API - Game Context:', {
      hasGameContext: !!gameContext,
      fen: gameContext?.fen,
      lastMove: gameContext?.lastMove,
      totalMoves: gameContext?.totalMoves,
      messageLength: message.length,
      hasGameId: !!gameId,
    });

    // Fetch comprehensive game memory context
    let fullGameContext = null;
    let chesterPersonality = null;

    if (gameId) {
      try {
        fullGameContext = await GameMemoryService.getGameContext(gameId);
        chesterPersonality = await ChesterMemoryService.getPersonalityContext(userId);

        console.log('Chester Memory Context:', {
          hasFullContext: !!fullGameContext,
          totalMovesInMemory: fullGameContext?.totalMoves || 0,
          commentaryCount: fullGameContext?.chesterCommentary?.length || 0,
          tacticalThemes: fullGameContext?.tacticalThemes || [],
          rapportLevel: chesterPersonality?.rapportLevel || 1,
          gamesPlayed: chesterPersonality?.gamesPlayed || 0,
        });
      } catch (error) {
        console.error('Error fetching game memory context:', error);
        // Continue without memory context - graceful degradation
      }
    }

    // Check if this is a playing style analysis question
    const styleAnalysisKeywords = [
      'playing style',
      'my style',
      'how am i playing',
      'my gameplay',
      'my approach',
      'my strategy',
      'my tactics',
      'my moves',
      'analyze my play',
      'my chess',
      'how do i play',
      'my tendencies',
      'my patterns',
      'my strengths',
      'my weaknesses',
    ];

    const isStyleAnalysis = styleAnalysisKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );

    // Check if asking about past games
    const pastGameKeywords = [
      'last game',
      'previous game',
      'past game',
      'earlier game',
      'before this',
      'our last',
      'that game',
      'recent game',
      'yesterday',
      'last match',
    ];

    const isAskingAboutPastGame = pastGameKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );

    // Fetch past game context if needed
    let pastGameContext = null;
    if (isAskingAboutPastGame) {
      try {
        const lastGame = await GameMemoryService.getLastCompletedGame(userId, gameId);
        if (lastGame) {
          pastGameContext = {
            result: lastGame.final_result,
            totalMoves: lastGame.total_moves,
            duration: lastGame.game_duration_seconds,
            tacticalThemes: lastGame.tactical_themes || [],
            narrative: lastGame.game_narrative,
            moveHistory: lastGame.full_move_history?.slice(-25) || [], // Last 25 moves
            commentary: lastGame.chester_commentary?.slice(-10) || [], // Last 10 comments
          };
          console.log('Past game context loaded:', {
            result: pastGameContext.result,
            moves: pastGameContext.totalMoves,
            moveHistoryLength: pastGameContext.moveHistory.length,
          });
        } else {
          console.log('No past game found for user:', userId);
        }
      } catch (error) {
        console.error('Error fetching past game:', error);
      }
    }

    // Build comprehensive instructions for Responses API
    let instructions = CHESS_BUTLER_SYSTEM_PROMPT;

    // Add Chester's personality and relationship context
    if (chesterPersonality) {
      instructions += `\n\nYOUR RELATIONSHIP WITH CHRIS:
- Rapport Level: ${chesterPersonality.rapportLevel}/10
- Games Played Together: ${chesterPersonality.gamesPlayed}
- Current Performance: ${chesterPersonality.recentPerformance}
- Current Streak: ${chesterPersonality.currentStreak > 0 ? `${chesterPersonality.currentStreak} wins` : 'none'}`;

      if (chesterPersonality.commonMistakes.length > 0) {
        instructions += `\n- Common Patterns to Watch: ${chesterPersonality.commonMistakes.join(', ')}`;
      }

      if (chesterPersonality.strongAreas.length > 0) {
        instructions += `\n- Strong Areas: ${chesterPersonality.strongAreas.join(', ')}`;
      }
    }

    if (gameContext?.fen) {
      instructions += `\n\nCURRENT BOARD STATE - You CAN see the board clearly:\n${formatMoveContext(gameContext.fen, gameContext.lastMove)}`;

      if (gameContext.totalMoves) {
        instructions += `\n\nGame Progress: ${gameContext.totalMoves} moves have been played.`;
      }
    } else {
      instructions += `\n\nNote: No current board state available. Ask Chris to make a move if you need to see the position.`;
    }

    // Add past game context if user is asking about it
    if (pastGameContext) {
      instructions += `\n\nPAST GAME DATA (you CAN see this):`;
      instructions += `\n- Result: ${pastGameContext.result || 'Unknown'}`;
      instructions += `\n- Total Moves: ${pastGameContext.totalMoves}`;

      if (pastGameContext.duration) {
        const mins = Math.floor(pastGameContext.duration / 60);
        instructions += `\n- Duration: ${mins} minutes`;
      }

      if (pastGameContext.tacticalThemes.length > 0) {
        instructions += `\n- Tactical Themes: ${pastGameContext.tacticalThemes.join(', ')}`;
      }

      if (pastGameContext.narrative) {
        instructions += `\n- Game Summary: ${pastGameContext.narrative}`;
      }

      if (pastGameContext.moveHistory.length > 0) {
        const moveSequence = pastGameContext.moveHistory
          .map(
            (m: any) => `${m.move_number}. ${m.player_type === 'human' ? 'Chris' : 'AI'}: ${m.san}`,
          )
          .join(', ');
        instructions += `\n- Key Moves: ${moveSequence}`;
      }

      if (pastGameContext.commentary.length > 0) {
        instructions += `\n- Your Commentary from that game:`;
        pastGameContext.commentary.forEach((c: any) => {
          instructions += `\n  * ${c.content}`;
        });
      }

      instructions += `\n\nUse this data to answer Chris's question about the past game.`;
    } else if (isAskingAboutPastGame) {
      // User asked about past game but we don't have data
      instructions += `\n\nNote: Chris is asking about a past game, but no completed game history was found in the database. Let them know you don't have records of previous games yet, but you'll remember future games.`;
    }

    // Add comprehensive game memory context
    if (fullGameContext) {
      // Add tactical themes detected
      if (fullGameContext.tacticalThemes.length > 0) {
        instructions += `\n\nTactical Themes in This Game: ${fullGameContext.tacticalThemes.join(', ')}`;
      }

      // Add game narrative if available
      if (fullGameContext.gameNarrative) {
        instructions += `\n\nGame Story So Far: ${fullGameContext.gameNarrative}`;
      }

      // Add recent commentary for context continuity
      const recentCommentary = fullGameContext.chesterCommentary.slice(-5);
      if (recentCommentary.length > 0) {
        instructions += `\n\nYour Recent Commentary:`;
        recentCommentary.forEach((comment) => {
          instructions += `\n- Move ${comment.move_number}: ${comment.content}`;
        });
      }

      // Add move history for style analysis questions
      if (isStyleAnalysis && fullGameContext.fullMoveHistory.length > 0) {
        const recentMoves = fullGameContext.fullMoveHistory.slice(-50); // Last 50 moves
        const moveSequence = recentMoves
          .map(
            (m) =>
              `${m.move_number}. ${m.player_type === 'human' ? 'Chris' : 'AI'}: ${m.san}${m.captured ? ` (captured ${m.captured})` : ''}`,
          )
          .join(', ');

        instructions += `\n\nRecent move history for style analysis (last ${recentMoves.length} moves): ${moveSequence}.

        As Chester, analyze Chris's playing style based on these moves, looking for patterns in:
        - Opening preferences and development
        - Tactical vs positional approach
        - Risk-taking vs cautious play
        - Piece coordination and planning
        - Endgame tendencies

        Provide specific, actionable insights about their chess style in your characteristic Chester voice.`;
      }
    } else if (isStyleAnalysis && moveHistory && moveHistory.length > 0) {
      // Fallback to old moveHistory if game memory not available
      const recentMoves = moveHistory.slice(-50);
      const moveSequence = recentMoves
        .filter((m: any) => m.metadata?.moveContext)
        .map((m: any) => `${m.role === 'user' ? 'Chris' : 'AI'}: ${m.metadata.moveContext}`)
        .join(', ');

      if (moveSequence) {
        instructions += `\n\nRecent move history for style analysis (last ${recentMoves.length} moves): ${moveSequence}.

        As Chester, analyze Chris's playing style based on these moves, looking for patterns in:
        - Opening preferences and development
        - Tactical vs positional approach
        - Risk-taking vs cautious play
        - Piece coordination and planning
        - Endgame tendencies

        Provide specific, actionable insights about their chess style in your characteristic Chester voice.`;
      }
    }

    // Use GPT-5 Responses API with reasoning control for faster responses
    // No need for response chaining - GPT-5 handles turn-by-turn naturally
    const completion = await createResponsesCompletion({
      model: 'gpt-5.2-2025-12-11',
      input: message,
      instructions: instructions,
      reasoning: {
        effort: 'low', // Fast responses for chat
      },
      max_output_tokens: 1000,
    });

    // Parse Responses API format
    const messageOutput = completion.output.find((item: any) => item.type === 'message');
    const textContent = messageOutput?.content.find(
      (content: any) => content.type === 'output_text',
    );
    let content = textContent?.text || 'Sorry, I encountered an issue.';

    // Validate move suggestions if a game context exists
    if (gameContext?.fen) {
      const moveSuggestions = extractMoveSuggestions(content);

      // Check each move suggestion and add corrections if needed
      for (const suggestion of moveSuggestions) {
        const validation = validateMoveSuggestion(gameContext.fen, suggestion);

        if (!validation.isValid) {
          // Log the error for debugging
          console.log(`Chester move validation error: ${suggestion} - ${validation.error}`);

          // If Chester made an error, append a correction note
          if (validation.correctedMove) {
            content += `\n\n[Note: ${validation.correctedMove}]`;
          }
        }
      }
    }

    // Save chat interaction to game memory
    if (gameId && gameContext?.totalMoves !== undefined) {
      try {
        // Save user's question as commentary
        await GameMemoryService.addCommentary(gameId, {
          move_number: gameContext.totalMoves,
          type: 'chat',
          content: `User: ${message}`,
          timestamp: new Date().toISOString(),
          metadata: {},
        });

        // Save Chester's response as commentary
        await GameMemoryService.addCommentary(gameId, {
          move_number: gameContext.totalMoves,
          type: 'chat',
          content: `Chester: ${content}`,
          timestamp: new Date().toISOString(),
          metadata: {
            urgency_level: isStyleAnalysis ? 'strategic' : undefined,
          },
        });

        console.log('Chat interaction saved to game memory');
      } catch (error) {
        console.error('Error saving chat to game memory:', error);
        // Don't fail the request if memory save fails
      }
    }

    // Increment usage counter for authenticated users
    if (authUser) {
      await incrementChatUsage(authUser.id);
    }

    // Build response headers with usage info
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
    };
    if (usageCheck) {
      Object.assign(
        responseHeaders,
        getUsageHeaders('chat', {
          remaining: usageCheck.unlimited ? Infinity : usageCheck.remaining - 1,
          limit: usageCheck.limit,
          unlimited: usageCheck.unlimited,
        }),
      );
    }

    // Return simple response - GPT-5 handles conversation naturally
    return new Response(content, { headers: responseHeaders });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
