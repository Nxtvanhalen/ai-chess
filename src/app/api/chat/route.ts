import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai/client';
import { CHESS_BUTLER_SYSTEM_PROMPT, formatMoveContext } from '@/lib/openai/chess-butler-prompt';

export async function POST(request: NextRequest) {
  try {
    const { message, gameContext } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    const openai = getOpenAIClient();
    
    // Build context message if game state is provided
    const messages: any[] = [
      { role: 'system', content: CHESS_BUTLER_SYSTEM_PROMPT }
    ];
    
    if (gameContext?.fen) {
      messages.push({
        role: 'system',
        content: formatMoveContext(gameContext.fen, gameContext.lastMove)
      });
    }
    
    messages.push({ role: 'user', content: message });
    
    // Use GPT-4o for the response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}