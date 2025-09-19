// web/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // If the project has image domains configured today, keep them here.
  images: {
    // example: domains: ['images.unsplash.com'],
  },
  // IMPORTANT: No rewrites/redirects that use regex lookaheads or capturing groups.
  // If rewrites are truly needed later, use simple segment patterns only (e.g. '/:path*').
};

export default nextConfig;
