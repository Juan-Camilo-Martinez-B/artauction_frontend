import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Auction, AuctionView } from '@/lib/api/types';
import { IntlWrapper } from '../intl';
import type { AuctionInbound } from '@/lib/ws/events';

const SERVER_TIME = '2026-11-04T15:00:00.000Z';
const notify = vi.fn();
const auctionRequests = vi.fn<(id: string) => Promise<AuctionView>>();
// El hook entrega al canal la funcion que aplica cada aviso: la prueba la usa para simular el servidor.
let deliver: (message: AuctionInbound) => void = () => undefined;

vi.mock('@/components/ui/toast', () => ({ useToast: () => notify }));
vi.mock('@/hooks/use-auction-channel', () => ({
  useAuctionChannel: (handler: (message: AuctionInbound) => void) => {
    deliver = handler;
    return { send: vi.fn() };
  },
}));
vi.mock('@/lib/session/browser-session', () => ({
  browserSession: { current: () => ({ status: 'anonymous', profile: null }), subscribe: () => () => undefined, accessToken: () => Promise.resolve(null) },
}));
vi.mock('@/lib/session/wallet-balance', () => ({ walletBalance: { refresh: vi.fn() } }));
vi.mock('@/lib/api/client', () => ({
  publicWsUrl: () => 'ws://localhost',
  artApi: {
    auction: (id: string) => auctionRequests(id),
    lot: () => Promise.resolve({ id: 'lot-1', title: 'Estatua' }),
    wallet: () => Promise.resolve({ balance: 0, held: 0, entries: [] }),
  },
}));

const { useLiveAuction } = await import('@/app/(public)/subasta/[id]/use-live-auction');

const AUCTION: Auction = {
  id: 'a1',
  lotId: 'lot-1',
  startPrice: '3000.00',
  currentPrice: '3000.00',
  minIncrement: '150.00',
  startsAt: '2026-11-04T14:00:00.000Z',
  endsAt: '2026-11-04T16:00:00.000Z',
  status: 'ACTIVA',
  winnerId: null,
  bids: [],
};

describe('estado vivo de la sala', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(SERVER_TIME) });
    notify.mockReset();
    auctionRequests.mockReset();
    auctionRequests.mockResolvedValue({ auction: AUCTION, serverTime: SERVER_TIME });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('carga la sala y aplica una puja aceptada por el canal en vivo', async () => {
    const { result } = renderHook(() => useLiveAuction('a1'), { wrapper: IntlWrapper });
    await waitFor(() => { expect(result.current.auction?.currentPrice).toBe('3000.00'); });
    expect(result.current.phase).toBe('live');

    act(() => {
      deliver({
        version: 1,
        type: 'bid-accepted',
        event: { version: 1, auctionId: 'a1', bidId: 'b1', bidderId: 'u2', amount: '3150.00', endsAt: '2026-11-04T16:00:30.000Z', extended: true, serverTime: SERVER_TIME },
      });
    });
    expect(result.current.auction?.currentPrice).toBe('3150.00');
    expect(result.current.auction?.endsAt).toBe('2026-11-04T16:00:30.000Z');
    expect(result.current.auction?.bids?.map((bid) => bid.id)).toEqual(['b1']);
    // Una puja de ultimo momento alarga el cierre y se avisa.
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('30 segundos'), 'info');
  });

  it('al cerrar queda cerrada con su ganador y se vuelve a pedir la sala completa', async () => {
    const { result } = renderHook(() => useLiveAuction('a1'), { wrapper: IntlWrapper });
    await waitFor(() => { expect(result.current.auction).not.toBeNull(); });
    const before = auctionRequests.mock.calls.length;
    auctionRequests.mockResolvedValue({ auction: { ...AUCTION, status: 'CERRADA', currentPrice: '9000.00', winnerId: 'u2', closedBy: 'BUY_NOW' }, serverTime: SERVER_TIME });

    act(() => {
      deliver({ version: 1, type: 'auction-closed', event: { version: 1, auctionId: 'a1', lotId: 'lot-1', winnerId: 'u2', amount: '9000.00', closedBy: 'BUY_NOW', serverTime: SERVER_TIME } });
    });
    expect(result.current.auction).toMatchObject({ status: 'CERRADA', winnerId: 'u2', closedBy: 'BUY_NOW', buyNowAvailable: false });
    await waitFor(() => { expect(auctionRequests.mock.calls.length).toBeGreaterThan(before); });
  });

  it('una sala que no existe se informa sin romper la pantalla', async () => {
    auctionRequests.mockRejectedValue(new Error('404'));
    const { result } = renderHook(() => useLiveAuction('a1'), { wrapper: IntlWrapper });
    await waitFor(() => { expect(result.current.loadError).toBe(true); });
    expect(result.current.auction).toBeNull();
  });
});
