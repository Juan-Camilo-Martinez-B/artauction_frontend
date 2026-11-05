import { describe, expect, it } from 'vitest';
import type { NotificationItem } from '@/lib/api/types';
import { buyNowOpen, buyNowThreshold } from '@/lib/auction/buy-now';
import { describeNotification } from '@/lib/describe-events';

const NOW = Date.parse('2026-11-03T12:00:00Z');
const open = { status: 'ACTIVA', endsAt: '2026-11-03T12:30:00Z', currentPrice: '600.00', buyNowPrice: '1800.00' };

describe('compra inmediata', () => {
  it('se ofrece con la sala abierta mientras el precio no llegue al 80 %', () => {
    expect(buyNowThreshold('1800.00')).toBe(1440);
    expect(buyNowOpen(open, NOW)).toBe(true);
    expect(buyNowOpen({ ...open, currentPrice: '1439.00' }, NOW)).toBe(true);
    expect(buyNowOpen({ ...open, currentPrice: '1440.00' }, NOW)).toBe(false);
    expect(buyNowOpen({ ...open, status: 'PROGRAMADA' }, NOW)).toBe(false);
    expect(buyNowOpen({ ...open, endsAt: '2026-11-03T11:59:59Z' }, NOW)).toBe(false);
    expect(buyNowOpen({ ...open, buyNowPrice: undefined }, NOW)).toBe(false);
  });

  it('los avisos distinguen la compra inmediata para comprador, vendedor y postores', () => {
    const notice = (kind: string, closedBy: string): NotificationItem => ({
      userId: 'u',
      kind,
      payload: { auctionId: 'a1', lotId: 'l1', winnerId: 'buyer', amount: '1800.00', closedBy },
      createdAt: '2026-11-03T12:00:00Z',
      readAt: null,
    });
    expect(describeNotification(notice('AUCTION_CLOSED', 'BUY_NOW'), 'buyer').message).toEqual({ kind: 'boughtNow', amount: '1800.00' });
    expect(describeNotification(notice('AUCTION_CLOSED', 'BUY_NOW'), 'seller').message.kind).toBe('soldBuyNow');
    expect(describeNotification(notice('AUCTION_CLOSED', 'TIME'), 'buyer').message.kind).toBe('wonAuction');
    const lost = describeNotification(notice('AUCTION_LOST', 'BUY_NOW'), 'bidder');
    expect(lost).toEqual({ message: { kind: 'lostBuyNow' }, href: '/obras/l1', tone: 'info' });
  });
});
