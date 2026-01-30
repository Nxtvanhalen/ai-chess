import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring - lower rate for edge
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.5,

  // Debug mode for development
  debug: false,

  // Environment
  environment: process.env.NODE_ENV,

  // Only send errors in production (or if DSN is set in dev)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
