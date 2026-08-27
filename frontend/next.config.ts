import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cloud Run wants a self-contained server bundle, not the whole node_modules tree.
  output: 'standalone',
};

export default nextConfig;
