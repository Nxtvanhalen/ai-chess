import type { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getUser';
import { generateSafetyNotice } from '@/lib/chess/board-validator';
import { CHESS_BUTLER_SYSTEM_PROMPT, formatMoveContext } from '@/lib/openai/chess-butler-prompt';
import { createResponsesCompletionStream, parseResponsesStream } from '@/lib/openai/client';
import { checkRateLimitRedis, getClientIPFromRequest, getRateLimitHeadersRedis } from '@/lib/redis';
import { ChesterMemoryService } from '@/lib/services/ChesterMemoryService';
import { GameMemoryService } from '@/lib/services/GameMemoryService';
import {
  canUseChat,
  createUsageLimitError,
  getUsageHeaders,
  getUserTier,
  incrementChatUsage,
} from '@/lib/supabase/subscription';
import { chatSchema, validateRequest } from '@/lib/validation/schemas';

function listToPromptText(items: unknown[]): string {
  return items
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        return String(item);
      }
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const prioritizedKeys = ['name', 'move', 'theme', 'label', 'content', 'type'];
        for (const key of prioritizedKeys) {
          if (typeof record[key] === 'string' && record[key]) return record[key] as string;
        }
        const firstStringValue = Object.values(record).find((v) => typeof v === 'string' && v);
        if (typeof firstStringValue === 'string') return firstStringValue;
      }
      return '';
    })
    .filter(Boolean)
    .join(', ');
}

function promptValue(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return listToPromptText(value);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const prioritizedKeys = ['content', 'text', 'name', 'move', 'theme', 'label', 'type'];
    for (const key of prioritizedKeys) {
      if (typeof record[key] === 'string' && record[key]) return record[key] as string;
    }
    const firstStringValue = Object.values(record).find((v) => typeof v === 'string' && v);
    if (typeof firstStringValue === 'string') return firstStringValue;
  }
  return fallback;
}

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
        const tier = await getUserTier(authUser.id);
        return new Response(JSON.stringify(createUsageLimitError('chat', usageCheck, tier)), {
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

    // Fetch memory context
    let fullGameContext = null;
    let chesterPersonality = null;

    if (gameId) {
      try {
        fullGameContext = await GameMemoryService.getGameContext(gameId);
        chesterPersonality = await ChesterMemoryService.getPersonalityContext(authUser?.id || null);
      } catch (error) {
        console.error('Error fetching game memory context:', error);
      }
    }

    // Add Chester's personality context
    if (chesterPersonality) {
      instructions += `\n\nYOUR RELATIONSHIP WITH CHRIS:
- Rapport Level: ${chesterPersonality.rapportLevel}/10
- Games Played Together: ${chesterPersonality.gamesPlayed}
- Current Performance: ${promptValue(chesterPersonality.recentPerformance, 'neutral')}`;

      if (chesterPersonality.commonMistakes.length > 0) {
        instructions += `\n- Common Patterns to Watch: ${listToPromptText(chesterPersonality.commonMistakes)}`;
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
        instructions += `\n\nTactical Themes: ${listToPromptText(fullGameContext.tacticalThemes)}`;
      }

      const recentCommentary = fullGameContext.chesterCommentary.slice(-3);
      if (recentCommentary.length > 0) {
        instructions += `\n\nYour Recent Commentary:`;
        recentCommentary.forEach((comment) => {
          instructions += `\n- Move ${comment.move_number}: ${promptValue(comment.content)}`;
        });
      }
    }

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
          controller.close();

          // Save to game memory after stream completes
          if (gameId && gameContext?.totalMoves !== undefined) {
            try {
              await GameMemoryService.addCommentary(gameId, {
                move_number: gameContext.totalMoves,
                type: 'chat',
                content: `User: ${message}`,
                timestamp: new Date().toISOString(),
                metadata: {},
              });

              await GameMemoryService.addCommentary(gameId, {
                move_number: gameContext.totalMoves,
                type: 'chat',
                content: `Chester: ${fullContent}`,
                timestamp: new Date().toISOString(),
                metadata: {},
              });
            } catch (error) {
              console.error('[Chester Stream] Error saving to memory:', error);
            }
          }

          // Increment chat usage for authenticated users
          if (authUser) {
            await incrementChatUsage(authUser.id);
          }
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
