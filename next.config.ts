import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Ensure @ alias resolves correctly in all environments
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
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

export default finalConfig;
