import { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { TextEncoder as NodeTextEncoder } from 'node:util';

const mockCheckRateLimitRedis = vi.fn();
const mockGetAuthenticatedUser = vi.fn();
const mockCanUseChat = vi.fn();
const mockIncrementChatUsage = vi.fn();
const mockCreateResponsesCompletion = vi.fn();
const mockCreateResponsesCompletionStream = vi.fn();
const mockParseResponsesStream = vi.fn();
const mockExtractMoveSuggestions = vi.fn();
const mockValidateMoveSuggestion = vi.fn();

if (typeof (globalThis as any).Response === 'undefined') {
  class MockHeaders {
    private values = new Map<string, string>();

    constructor(init: Record<string, string> = {}) {
      for (const [key, value] of Object.entries(init)) {
        this.values.set(key.toLowerCase(), value);
      }
    }

    get(key: string) {
      return this.values.get(key.toLowerCase()) || null;
    }
  }

  class MockResponse {
    status: number;
    headers: MockHeaders;
    private body: string;

    constructor(body?: string, init?: ResponseInit) {
      this.body = body || '';
      this.status = init?.status ?? 200;
      this.headers = new MockHeaders((init?.headers as Record<string, string>) || {});
    }

    async json() {
      return JSON.parse(this.body || '{}');
    }

    async text() {
      return this.body;
    }
  }

  (globalThis as any).Response = MockResponse;
}

if (typeof (globalThis as any).TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = NodeTextEncoder;
}

if (typeof (globalThis as any).ReadableStream === 'undefined') {
  (globalThis as any).ReadableStream = NodeReadableStream;
}

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      }),
  },
}));

vi.mock('@/lib/redis', () => ({
  checkRateLimitRedis: (...args: unknown[]) => mockCheckRateLimitRedis(...args),
  getClientIPFromRequest: () => '127.0.0.1',
  getRateLimitHeadersRedis: () => ({
    'X-RateLimit-Limit': '20',
    'X-RateLimit-Remaining': '19',
    'X-RateLimit-Reset': '9999999999',
  }),
}));

vi.mock('@/lib/auth/getUser', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

vi.mock('@/lib/supabase/subscription', () => ({
  canUseChat: (...args: unknown[]) => mockCanUseChat(...args),
  createUsageLimitError: () => ({ error: 'Usage limit reached' }),
  getUsageHeaders: () => ({ 'X-Usage-Limit': '200' }),
  incrementChatUsage: (...args: unknown[]) => mockIncrementChatUsage(...args),
}));

vi.mock('@/lib/openai/client', () => ({
  createResponsesCompletion: (...args: unknown[]) => mockCreateResponsesCompletion(...args),
  createResponsesCompletionStream: (...args: unknown[]) =>
    mockCreateResponsesCompletionStream(...args),
  parseResponsesStream: (...args: unknown[]) => mockParseResponsesStream(...args),
}));

vi.mock('@/lib/chess/board-validator', () => ({
  extractMoveSuggestions: (...args: unknown[]) => mockExtractMoveSuggestions(...args),
  validateMoveSuggestion: (...args: unknown[]) => mockValidateMoveSuggestion(...args),
}));

vi.mock('@/lib/services/GameMemoryService', () => ({
  GameMemoryService: {
    getGameContext: vi.fn().mockResolvedValue(null),
    getLastCompletedGame: vi.fn().mockResolvedValue(null),
    addCommentary: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/ChesterMemoryService', () => ({
  ChesterMemoryService: {
    getPersonalityContext: vi.fn().mockResolvedValue(null),
  },
}));

describe('chat routes', () => {
  const createMockRequest = (body: unknown, headers: Record<string, string> = {}) =>
    ({
      headers: {
        get: (key: string) => headers[key.toLowerCase()] || null,
      },
      json: async () => body,
    }) as any;

  const loadRoutes = async () => {
    const chatModule = await import('@/app/api/chat/route');
    const streamModule = await import('@/app/api/chat/stream/route');
    return {
      postChat: chatModule.POST,
      postStream: streamModule.POST,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimitRedis.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60_000,
    });
    mockGetAuthenticatedUser.mockResolvedValue(null);
    mockCanUseChat.mockResolvedValue({
      allowed: true,
      remaining: 100,
      limit: 200,
      unlimited: false,
    });
    mockIncrementChatUsage.mockResolvedValue(undefined);
    mockExtractMoveSuggestions.mockReturnValue([]);
    mockValidateMoveSuggestion.mockReturnValue({ isValid: true });
  });

  it('returns 400 for invalid /api/chat payload', async () => {
    const { postChat } = await loadRoutes();
    const request = createMockRequest({});

    const response = await postChat(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Validation failed/i);
    expect(mockCreateResponsesCompletion).not.toHaveBeenCalled();
  });

  it('returns text for valid /api/chat payload', async () => {
    const { postChat } = await loadRoutes();
    mockCreateResponsesCompletion.mockResolvedValue({
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: 'Nice move!' }],
        },
      ],
    });

    const request = createMockRequest({ message: 'What should I do next?' });
    const response = await postChat(request);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('Nice move!');
  });

  it('returns 400 for invalid /api/chat/stream payload', async () => {
    const { postStream } = await loadRoutes();
    const request = createMockRequest({});

    const response = await postStream(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Validation failed/i);
    expect(mockCreateResponsesCompletionStream).not.toHaveBeenCalled();
  });

  it('returns SSE for valid /api/chat/stream payload', async () => {
    const { postStream } = await loadRoutes();
    async function* fakeChunks() {
      yield 'Hi';
      yield ' there';
    }

    mockCreateResponsesCompletionStream.mockResolvedValue(
      new NodeReadableStream({
        start(controller) {
          controller.close();
        },
      }),
    );
    mockParseResponsesStream.mockReturnValue(fakeChunks());

    const request = createMockRequest({ message: 'Talk to me' });
    const response = await postStream(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    expect(mockParseResponsesStream).toHaveBeenCalledTimes(1);
  });
});
