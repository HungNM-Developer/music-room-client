import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Fonts read from disk by the link-preview image (app/r/[code]/share-image/route.tsx).
  outputFileTracingIncludes: { '/r/[code]/share-image': ['./assets/og/**'] },
  async redirects() {
    // R-48: v1 links keep working.
    return [{ source: '/room/:id', destination: '/r/:id', permanent: true }];
  },
};

export default nextConfig;
