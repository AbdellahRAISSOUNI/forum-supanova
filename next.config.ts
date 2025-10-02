import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep standalone output for better performance
  output: 'standalone',
  // Enable Turbopack but with better configuration
  experimental: {
    turbo: {
      // Configure Turbopack properly
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

export default nextConfig;
