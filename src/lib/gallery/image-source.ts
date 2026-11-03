// Origen de las imagenes que la sala 3D usa como textura. WebGL solo acepta
// imagenes con CORS: las de Garage lo traen y se cargan directo; las de hosts
// externos sin CORS (la coleccion abierta del Met) pasan por el proxy de
// /api/artwork-image, que solo atiende a los hosts de esta lista.

export const PROXIED_IMAGE_HOSTS: ReadonlySet<string> = new Set(['images.metmuseum.org']);

export const IMAGE_PROXY_PATH = '/api/artwork-image';

/** Valida la URL pedida al proxy: https y un host permitido, sin credenciales ni puertos raros. */
export function parseProxiedImageUrl(raw: string | null): URL | null {
  if (!raw || raw.length > 2048) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.port !== '') {
    return null;
  }
  return PROXIED_IMAGE_HOSTS.has(url.hostname) ? url : null;
}

/**
 * URL que la sala debe pedir para usar la imagen como textura. A las URLs
 * directas se les agrega `texture=1`: Garage solo responde CORS si la peticion
 * trae Origin y no envia `Vary: Origin`, asi que el navegador reutilizaria la
 * copia que dejo un <img> del catalogo (sin CORS) y WebGL la rechazaria. Con el
 * parametro, la textura tiene su propia entrada de cache.
 */
export function textureSource(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  if (parseProxiedImageUrl(url)) {
    return `${IMAGE_PROXY_PATH}?src=${encodeURIComponent(url)}`;
  }
  try {
    const direct = new URL(url);
    direct.searchParams.set('texture', '1');
    return direct.toString();
  } catch {
    return null;
  }
}
