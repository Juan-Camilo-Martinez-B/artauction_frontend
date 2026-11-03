/**
 * Destino al que volver tras entrar. Solo se aceptan rutas internas: un valor
 * como "//otro-sitio.com" o "https://..." abriria una redireccion a terceros.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 300) {
    return null;
  }
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\') || /[\r\n]/.test(raw)) {
    return null;
  }
  return raw;
}

/** Enlace a la pagina de entrar que devuelve a `path` despues. */
export function loginHref(path: string): string {
  const next = safeNextPath(path);
  return next && next !== '/entrar' ? `/entrar?next=${encodeURIComponent(next)}` : '/entrar';
}
