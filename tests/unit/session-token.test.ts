import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const me = vi.fn();
vi.mock('@/lib/api/client', () => ({ artApi: { me } }));

const { readAccessToken, tokenExpiresAt, writeAccessToken } = await import('@/lib/session');
const { browserSession } = await import('@/lib/session/browser-session');

/** JWT sin firma valida: el frontend solo lee `exp`. */
function tokenExpiringIn(ms: number): string {
  const payload = btoa(JSON.stringify({ sub: 'u1', exp: Math.floor((Date.now() + ms) / 1000) }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.firma`;
}

const USER = { userId: 'u1', email: 'admin@example.test', role: 'ADMIN', displayName: 'Admin', locale: 'es' };

describe('token de acceso guardado', () => {
  beforeEach(() => {
    sessionStorage.clear();
    me.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lee el vencimiento del token', () => {
    const token = tokenExpiringIn(10 * 60_000);
    expect(tokenExpiresAt(token)).toBeGreaterThan(Date.now());
    expect(tokenExpiresAt('no-es-un-jwt')).toBeNull();
  });

  it('descarta un token vencido o a punto de vencer y conserva uno vigente', () => {
    writeAccessToken(tokenExpiringIn(-1_000));
    expect(readAccessToken()).toBeNull();
    writeAccessToken(tokenExpiringIn(30_000));
    expect(readAccessToken()).toBeNull();
    const fresh = tokenExpiringIn(10 * 60_000);
    writeAccessToken(fresh);
    expect(readAccessToken()).toBe(fresh);
  });

  it('con la sesion iniciada y el token vencido lo renueva con la cookie de refresco', async () => {
    const renewed = tokenExpiringIn(15 * 60_000);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ accessToken: renewed }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    me.mockResolvedValue(USER);

    writeAccessToken(tokenExpiringIn(10 * 60_000));
    await browserSession.restore();
    expect(browserSession.current().status).toBe('authenticated');

    writeAccessToken(tokenExpiringIn(-1_000));
    await expect(browserSession.accessToken()).resolves.toBe(renewed);
    expect(fetchMock).toHaveBeenCalledWith('/api/session/refresh', { method: 'POST' });
    expect(browserSession.current().status).toBe('authenticated');
  });
});
