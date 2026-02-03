import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Note: The @ alias is configured in tsconfig.json and works with both Webpack and Turbopack
};


// Only use bundle analyzer in development when explicitly requested
let finalConfig = nextConfig;

if (process.env.ANALYZE === 'true') {
  try {
    const withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
    finalConfig = withBundleAnalyzer(nextConfig);
  } catch (error) {
    console.warn('Bundle analyzer not available, proceeding without it');
  }
}

// Add security headers (only strict in production)
const isProd = process.env.NODE_ENV === 'production';

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  // HSTS only for production to avoid breaking localhost
  ...(isProd ? [{
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  }] : []),
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self';",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://*.sentry.io https://www.googletagmanager.com;",
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' blob: data: https://*.supabase.co https://www.googletagmanager.com;",
      "font-src 'self';",
      "connect-src 'self' https://*.supabase.co https://api.openai.com https://*.sentry.io https://*.ingest.sentry.io https://www.google-analytics.com https://www.googletagmanager.com;",
      "frame-ancestors 'none';",
      "worker-src 'self' blob:;",
      // Only upgrade requests in production
      ...(isProd ? ["upgrade-insecure-requests;"] : [])
    ].join(' ').replace(/\s{2,}/g, ' ').trim()
  }
];

// Extend the config with headers
const configWithHeaders: NextConfig = {
  ...finalConfig,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// Wrap with Sentry (only if DSN is configured)
const sentryConfig = withSentryConfig(configWithHeaders, {
  // Sentry webpack plugin options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in production builds
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",

  // Source maps configuration
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});

export default sentryConfig;
