import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay - only in production
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Debug mode for development
  debug: false,

  // Environment
  environment: process.env.NODE_ENV,

  // Only send errors in production (or if DSN is set in dev)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Filter out known non-critical errors
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Ignore network errors that are expected
    if (error instanceof Error) {
      // Ignore AbortError (user cancelled requests)
      if (error.name === 'AbortError') {
        return null;
      }

      // Ignore rate limit responses (expected behavior)
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        return null;
      }
    }

    return event;
  },

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
