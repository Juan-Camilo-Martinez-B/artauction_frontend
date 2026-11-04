import { beforeEach, describe, expect, it, vi } from 'vitest';

const wallet = vi.fn();
const accessToken = vi.fn();
vi.mock('@/lib/api/client', () => ({ artApi: { wallet } }));
vi.mock('@/lib/session/browser-session', () => ({ browserSession: { accessToken } }));

const { walletBalance } = await import('@/lib/session/wallet-balance');

describe('saldo del encabezado', () => {
  beforeEach(() => {
    wallet.mockReset();
    accessToken.mockReset();
    walletBalance.clear();
  });

  it('pide el saldo una sola vez aunque varias partes lo refresquen a la vez', async () => {
    accessToken.mockResolvedValue('token');
    wallet.mockResolvedValue({ balance: 1200, held: 300, entries: [] });
    const seen: unknown[] = [];
    const stop = walletBalance.subscribe((snapshot) => seen.push(snapshot));
    await Promise.all([walletBalance.refresh(), walletBalance.refresh()]);
    expect(wallet).toHaveBeenCalledTimes(1);
    expect(walletBalance.current()).toEqual({ balance: 1200, held: 300 });
    expect(seen.at(-1)).toEqual({ balance: 1200, held: 300 });
    stop();
  });

  it('un fallo pasajero conserva el ultimo saldo y sin sesion se olvida', async () => {
    accessToken.mockResolvedValue('token');
    wallet.mockResolvedValueOnce({ balance: 500, held: 0, entries: [] }).mockRejectedValueOnce(new Error('caido'));
    await walletBalance.refresh();
    await walletBalance.refresh();
    expect(walletBalance.current()).toEqual({ balance: 500, held: 0 });
    accessToken.mockResolvedValue(null);
    await walletBalance.refresh();
    expect(walletBalance.current()).toBeNull();
  });
});
