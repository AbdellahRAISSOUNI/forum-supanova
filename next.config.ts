import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep standalone output for better performance
  output: 'standalone',
  // Configure Turbopack properly
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  // Disable ESLint during build for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
