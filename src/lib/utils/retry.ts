// Retry utility for API calls with exponential backoff

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryCondition?: (error: unknown) => boolean;
}

/** Safely extract a property from an unknown error object */
function getErrorProp<T>(error: unknown, key: string): T | undefined {
  if (error && typeof error === 'object' && key in error) {
    return (error as Record<string, unknown>)[key] as T;
  }
  return undefined;
}

function isRetryableError(error: unknown): boolean {
  const status = getErrorProp<number>(error, 'status');
  if (status !== undefined) {
    return status >= 500 || status === 429;
  }

  const code = getErrorProp<string>(error, 'code');
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT') return true;

  const message = getErrorProp<string>(error, 'message');
  if (message && (message.includes('network') || message.includes('timeout'))) return true;

  return false;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryCondition: isRetryableError,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

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
    retryCondition: (error: unknown) => {
      const status = getErrorProp<number>(error, 'status');
      if (status !== undefined) {
        return [429, 500, 502, 503, 504].includes(status);
      }

      const code = getErrorProp<string>(error, 'code');
      if (code === 'ECONNRESET' || code === 'ETIMEDOUT') return true;

      const message = getErrorProp<string>(error, 'message');
      if (message && (message.includes('network') || message.includes('timeout'))) return true;

      return false;
    },
  });
}
