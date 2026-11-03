import type { NextConfig } from 'next';

const privateHeader = { key: 'Cache-Control', value: 'private, no-store' };

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  images: { unoptimized: true },
  async headers() {
    return ['/perfil', '/publicar', '/publicar/:id', '/mis-obras', '/feed', '/notificaciones', '/admin'].map((source) => ({
      source,
      headers: [privateHeader],
    }));
  },
  // "Mi coleccion" se unio a "Mis obras": los enlaces viejos siguen funcionando.
  async redirects() {
    return [{ source: '/galeria', destination: '/mis-obras?estado=ganadas', permanent: true }];
  },
};

export default nextConfig;
