import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LiveAuctions as LiveAuctionsResponse, Lot } from '@/lib/api/types';

const liveAuctions = vi.fn<() => Promise<LiveAuctionsResponse>>();
vi.mock('@/lib/api/client', () => ({ artApi: { liveAuctions: () => liveAuctions() } }));

const { LiveAuctions } = await import('@/components/auctions/live-auctions');

const SERVER_TIME = '2026-11-02T15:00:00.000Z';

function lot(id: string, title: string, auction: NonNullable<Lot['auction']>): Lot {
  return {
    id,
    sellerId: 'seller',
    title,
    description: '',
    artistName: null,
    creationYear: null,
    visibility: 'PUBLIC',
    materials: '',
    status: 'PUBLICADA',
    authenticityScore: 80,
    suggestedPriceMin: null,
    suggestedPriceMax: null,
    currency: 'ATC',
    auction,
  };
}

describe('cartelera en vivo', () => {
  it('distingue las salas en vivo de las próximas y enlaza a cada sala', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(SERVER_TIME) });
    liveAuctions.mockResolvedValue({
      serverTime: SERVER_TIME,
      items: [
        lot('l1', 'Marina', { id: 'a1', status: 'ACTIVA', currentPrice: '450.00', startsAt: '2026-11-02T14:50:00.000Z', endsAt: '2026-11-02T15:10:00.000Z' }),
        lot('l2', 'Jarrón', { id: 'a2', status: 'PROGRAMADA', currentPrice: '300.00', startsAt: '2026-11-02T15:03:00.000Z', endsAt: '2026-11-02T15:23:00.000Z' }),
      ],
    });
    render(<LiveAuctions />);

    const live = await screen.findByRole('link', { name: /Marina/ });
    expect(live).toHaveAttribute('href', '/subasta/a1');
    expect(live).toHaveTextContent('En vivo');
    expect(live).toHaveTextContent('Cierra en');
    expect(live).toHaveTextContent('450 artacoins');

    const upcoming = screen.getByRole('link', { name: /Jarrón/ });
    expect(upcoming).toHaveTextContent('Próxima');
    expect(upcoming).toHaveTextContent('Abre en');
    expect(upcoming).toHaveTextContent('Salida');
    vi.useRealTimers();
  });

  it('avisa cuando no hay salas en cartelera', async () => {
    liveAuctions.mockResolvedValue({ serverTime: SERVER_TIME, items: [] });
    render(<LiveAuctions />);
    expect(await screen.findByText(/preparando la próxima sala/)).toBeInTheDocument();
  });
});
