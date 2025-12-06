import OpenAI from 'openai';
import { withOpenAIRetry } from '@/lib/utils/retry';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    openaiClient = new OpenAI({
      apiKey: apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 0, // We'll handle retries ourselves
    });
  }
  
  return openaiClient;
}

// Export openai client for direct use
export const openai = getOpenAIClient();

// Wrapper for OpenAI chat completions with retry logic
export async function createChatCompletion(params: OpenAI.Chat.Completions.ChatCompletionCreateParams) {
  const client = getOpenAIClient();
  
  // For streaming requests, we need to handle them differently due to retry complexity
  if (params.stream) {
    // For streaming, we'll do a simple call with built-in OpenAI retry (set to 1)
    const streamingClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      timeout: 30000,
      maxRetries: 1, // OpenAI built-in retry for streaming
    });
    return streamingClient.chat.completions.create(params);
  }
  
  // For non-streaming, use our custom retry logic
  return withOpenAIRetry(() => client.chat.completions.create(params));
}

// GPT-5 Responses API wrapper with reasoning controls
export interface ResponsesAPIParams {
  model: string;
  input: string;
  instructions: string;
  reasoning?: {
    effort: 'none' | 'low' | 'medium' | 'high';
  };
  previous_response_id?: string;
  max_output_tokens?: number;
  stream?: boolean;
}

export async function createResponsesCompletion(params: ResponsesAPIParams) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  return withOpenAIRetry(async () => {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Responses API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    return response.json();
  });
}

// Streaming version of Responses API for real-time Chester responses
export async function createResponsesCompletionStream(
  params: Omit<ResponsesAPIParams, 'stream'>
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...params, stream: true }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Responses API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
  }

  if (!response.body) {
    throw new Error('No response body for streaming');
  }

  return response.body;
}

// Parse SSE stream and extract text chunks
export async function* parseResponsesStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);

            // Extract text delta from response
            if (parsed.type === 'response.output_text.delta') {
              yield parsed.delta || '';
            } else if (parsed.type === 'content_block_delta') {
              yield parsed.delta?.text || '';
            } else if (parsed.delta?.content) {
              // Handle various delta formats
              for (const content of parsed.delta.content) {
                if (content.type === 'output_text' && content.text) {
                  yield content.text;
                }
              }
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}