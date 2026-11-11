const ACCESS = 'aa_access';
/** Margen antes del vencimiento: un token que vence en menos de esto ya se renueva. */
const EXPIRY_MARGIN_MS = 60_000;

export interface SessionUser {
  userId: string;
  email: string;
  role: string;
  accessToken: string;
}

/**
 * Momento de vencimiento (ms) que declara el token en su campo `exp`, o null si
 * no se puede leer. Solo se decodifica, no se verifica: la firma la valida el backend.
 */
export function tokenExpiresAt(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const json: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const exp = typeof json === 'object' && json !== null && 'exp' in json ? json.exp : null;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Token guardado, o null si no hay o si vencio (o vence en menos del margen). */
export function readAccessToken(now: number = Date.now()): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const token = sessionStorage.getItem(ACCESS);
  if (!token) {
    return null;
  }
  const expiresAt = tokenExpiresAt(token);
  if (expiresAt !== null && expiresAt - now < EXPIRY_MARGIN_MS) {
    // Vencido: se descarta para que la sesion lo renueve con la cookie de refresco.
    sessionStorage.removeItem(ACCESS);
    return null;
  }
  return token;
}

export function writeAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS, token);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS);
}
