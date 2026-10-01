import type { NextConfig } from 'next';

const privateHeader = { key: 'Cache-Control', value: 'private, no-store' };

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  images: { unoptimized: true },
  async headers() {
    return ['/perfil', '/galeria', '/publicar', '/feed', '/notificaciones', '/admin'].map((source) => ({
      source,
      headers: [privateHeader],
    }));
  },
};

export default nextConfig;
