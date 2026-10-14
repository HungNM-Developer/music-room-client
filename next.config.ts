import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    // R-48: v1 links keep working.
    return [{ source: '/room/:id', destination: '/r/:id', permanent: true }];
  },
};

export default nextConfig;
