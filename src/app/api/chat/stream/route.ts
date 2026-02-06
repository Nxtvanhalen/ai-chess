import type { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getUser';
import {
  buildBoardStateInstructions,
  buildGameMemoryInstructions,
  buildPersonalityInstructions,
} from '@/lib/chat/prompt-utils';
import { generateSafetyNotice } from '@/lib/chess/board-validator';
import { CHESS_BUTLER_SYSTEM_PROMPT } from '@/lib/openai/chess-butler-prompt';
import { createResponsesCompletionStream, parseResponsesStream } from '@/lib/openai/client';
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

/**
 * Streaming Chat API for Chester
 * Returns Server-Sent Events for real-time character-by-character responses
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit (Redis-based, falls back to in-memory)
    const clientIP = getClientIPFromRequest(request);
    const rateLimitResult = await checkRateLimitRedis(clientIP, 'chat');

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait before sending another message.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...getRateLimitHeadersRedis(rateLimitResult),
          },
        },
      );
    }

    const body = await request.json();
    const validation = validateRequest(chatSchema, body);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { message, gameContext, gameId } = validation.data;

    const authUser = await getAuthenticatedUser();

    if (authUser) {
      const usageCheck = await canUseChat(authUser.id);
      if (!usageCheck.allowed) {
        return new Response(JSON.stringify(createUsageLimitError('chat', usageCheck)), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...getUsageHeaders('chat', usageCheck),
          },
        });
      }
    }

    // Build instructions (same logic as non-streaming route)
    let instructions = CHESS_BUTLER_SYSTEM_PROMPT;

    // Fetch memory context (parallelized for performance)
    let fullGameContext = null;
    let chesterPersonality = null;

    if (gameId) {
      try {
        [fullGameContext, chesterPersonality] = await Promise.all([
          GameMemoryService.getGameContext(gameId),
          ChesterMemoryService.getPersonalityContext(authUser?.id || null),
        ]);
      } catch (error) {
        console.error('Error fetching game memory context:', error);
      }
    }

    // Add Chester's personality, board state, and game memory context
    instructions += buildPersonalityInstructions(chesterPersonality);
    instructions += buildBoardStateInstructions(gameContext);
    instructions += buildGameMemoryInstructions(fullGameContext);


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

          // Add a deterministic tactical safety note when needed.
          if (gameContext?.fen) {
            const safetyNotice = generateSafetyNotice(gameContext.fen, fullContent);
            if (safetyNotice) {
              const safetyChunk = `\n\n[${safetyNotice}]`;
              fullContent += safetyChunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: safetyChunk })}\n\n`),
              );
            }
          }

          // Send completion signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, fullContent })}\n\n`),
          );

          // Perform DB operations BEFORE closing the stream
          // On serverless, the function may be killed after close()
          if (gameId && gameContext?.totalMoves !== undefined) {
            try {
              await Promise.all([
                GameMemoryService.addCommentary(gameId, {
                  move_number: gameContext.totalMoves,
                  type: 'chat',
                  content: `User: ${message}`,
                  timestamp: new Date().toISOString(),
                  metadata: {},
                }),
                GameMemoryService.addCommentary(gameId, {
                  move_number: gameContext.totalMoves,
                  type: 'chat',
                  content: `Chester: ${fullContent}`,
                  timestamp: new Date().toISOString(),
                  metadata: {},
                }),
              ]);
            } catch (error) {
              console.error('[Chester Stream] Error saving to memory:', error);
            }
          }

          // Increment chat usage for authenticated users
          if (authUser) {
            await incrementChatUsage(authUser.id);
          }

          controller.close();
        } catch (error) {
          console.error('[Chester Stream] Stream error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...getRateLimitHeadersRedis(rateLimitResult),
      },
    });
  } catch (error) {
    console.error('[Chester Stream] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
