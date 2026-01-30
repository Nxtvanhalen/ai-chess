import { NextRequest } from 'next/server';
import { createResponsesCompletionStream, parseResponsesStream } from '@/lib/openai/client';
import { CHESS_BUTLER_SYSTEM_PROMPT, formatMoveContext } from '@/lib/openai/chess-butler-prompt';
import { checkRateLimit, getRateLimitHeaders, getClientIP } from '@/lib/middleware/rate-limit';
import { GameMemoryService } from '@/lib/services/GameMemoryService';
import { ChesterMemoryService } from '@/lib/services/ChesterMemoryService';

/**
 * Streaming Chat API for Chester
 * Returns Server-Sent Events for real-time character-by-character responses
 */
export async function POST(request: NextRequest) {
  // Check rate limit
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP);

  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Please wait before sending another message.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...getRateLimitHeaders(rateLimitResult)
        }
      }
    );
  }

  try {
    const { message, gameContext, gameId, userId } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build instructions (same logic as non-streaming route)
    let instructions = CHESS_BUTLER_SYSTEM_PROMPT;

    // Fetch memory context
    let fullGameContext = null;
    let chesterPersonality = null;

    if (gameId) {
      try {
        fullGameContext = await GameMemoryService.getGameContext(gameId);
        chesterPersonality = await ChesterMemoryService.getPersonalityContext(userId);
      } catch (error) {
        console.error('Error fetching game memory context:', error);
      }
    }

    // Add Chester's personality context
    if (chesterPersonality) {
      instructions += `\n\nYOUR RELATIONSHIP WITH CHRIS:
- Rapport Level: ${chesterPersonality.rapportLevel}/10
- Games Played Together: ${chesterPersonality.gamesPlayed}
- Current Performance: ${chesterPersonality.recentPerformance}`;

      if (chesterPersonality.commonMistakes.length > 0) {
        instructions += `\n- Common Patterns to Watch: ${chesterPersonality.commonMistakes.join(', ')}`;
      }
    }

    // Add board state
    if (gameContext?.fen) {
      instructions += `\n\nCURRENT BOARD STATE:\n${formatMoveContext(gameContext.fen, gameContext.lastMove)}`;
      if (gameContext.totalMoves) {
        instructions += `\n\nGame Progress: ${gameContext.totalMoves} moves played.`;
      }
    }

    // Add game memory context
    if (fullGameContext) {
      if (fullGameContext.tacticalThemes.length > 0) {
        instructions += `\n\nTactical Themes: ${fullGameContext.tacticalThemes.join(', ')}`;
      }

      const recentCommentary = fullGameContext.chesterCommentary.slice(-3);
      if (recentCommentary.length > 0) {
        instructions += `\n\nYour Recent Commentary:`;
        recentCommentary.forEach(comment => {
          instructions += `\n- Move ${comment.move_number}: ${comment.content}`;
        });
      }
    }

    console.log('[Chester Stream] Starting streaming response...');

    // Create streaming response
    const stream = await createResponsesCompletionStream({
      model: 'gpt-5.2-2025-12-11',
      input: message,
      instructions: instructions,
      reasoning: { effort: 'low' },
      max_output_tokens: 1000,
    });

    // Create a TransformStream to convert the OpenAI stream to SSE format
    const encoder = new TextEncoder();
    let fullContent = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of parseResponsesStream(stream)) {
            if (chunk) {
              fullContent += chunk;
              // Send SSE formatted data
              const sseData = `data: ${JSON.stringify({ text: chunk })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
          }

          // Send completion signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullContent })}\n\n`));
          controller.close();

          // Save to game memory after stream completes
          if (gameId && gameContext?.totalMoves !== undefined) {
            try {
              await GameMemoryService.addCommentary(gameId, {
                move_number: gameContext.totalMoves,
                type: 'chat',
                content: `User: ${message}`,
                timestamp: new Date().toISOString(),
                metadata: {}
              });

              await GameMemoryService.addCommentary(gameId, {
                move_number: gameContext.totalMoves,
                type: 'chat',
                content: `Chester: ${fullContent}`,
                timestamp: new Date().toISOString(),
                metadata: {}
              });

              console.log('[Chester Stream] Chat saved to game memory');
            } catch (error) {
              console.error('[Chester Stream] Error saving to memory:', error);
            }
          }
        } catch (error) {
          console.error('[Chester Stream] Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...getRateLimitHeaders(rateLimitResult)
      }
    });
  } catch (error) {
    console.error('[Chester Stream] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
