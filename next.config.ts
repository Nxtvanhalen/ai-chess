import type { NextConfig } from "next";

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
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com;",
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' blob: data: https://*.supabase.co;",
      "font-src 'self';",
      "connect-src 'self' https://*.supabase.co https://api.openai.com;",
      "frame-ancestors 'none';",
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

export default configWithHeaders;
