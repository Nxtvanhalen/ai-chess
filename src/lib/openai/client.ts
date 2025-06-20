import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY || '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';
    
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
  }
  
  return openaiClient;
}