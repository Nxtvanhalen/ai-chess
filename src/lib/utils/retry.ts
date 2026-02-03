// Retry utility for API calls with exponential backoff

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryCondition?: (error: any) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryCondition: (error) => {
    // Retry on network errors, rate limits, and server errors
    if (error?.status) {
      return error.status >= 500 || error.status === 429;
    }
    // Retry on network/timeout errors
    return (
      error?.code === 'ECONNRESET' ||
      error?.code === 'ETIMEDOUT' ||
      error?.message?.includes('network') ||
      error?.message?.includes('timeout')
    );
  },
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Don't retry if error doesn't meet retry condition
      if (opts.retryCondition && !opts.retryCondition(error)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(opts.baseDelayMs * 2 ** attempt, opts.maxDelayMs);

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay * (0.5 + Math.random() * 0.5);

      console.warn(
        `Operation failed on attempt ${attempt + 1}, retrying in ${Math.round(jitteredDelay)}ms:`,
        error,
      );

      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError;
}

// Specialized retry for OpenAI API calls
export async function withOpenAIRetry<T>(operation: () => Promise<T>): Promise<T> {
  return withRetry(operation, {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 8000,
    retryCondition: (error) => {
      // OpenAI specific retry conditions
      if (error?.status) {
        switch (error.status) {
          case 429: // Rate limit
          case 500: // Internal server error
          case 502: // Bad gateway
          case 503: // Service unavailable
          case 504: // Gateway timeout
            return true;
          default:
            return false;
        }
      }

      // Network/timeout errors
      return (
        error?.code === 'ECONNRESET' ||
        error?.code === 'ETIMEDOUT' ||
        error?.message?.includes('network') ||
        error?.message?.includes('timeout')
      );
    },
  });
}
