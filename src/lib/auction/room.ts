import type { Auction, Bid } from '@/lib/api/types';

/** Momento de la sala, segun el estado del servidor y la hora (del servidor). */
export type RoomPhase = 'upcoming' | 'opening' | 'live' | 'closing' | 'closed';

export function roomPhase(auction: Pick<Auction, 'status' | 'startsAt' | 'endsAt'>, serverNow: number): RoomPhase {
  if (auction.status === 'CERRADA') {
    return 'closed';
  }
  if (auction.status === 'ACTIVA') {
    // El cierre lo decide el programador: pasado endsAt, la sala esta cerrando.
    return new Date(auction.endsAt).getTime() > serverNow ? 'live' : 'closing';
  }
  return auction.startsAt && new Date(auction.startsAt).getTime() > serverNow ? 'upcoming' : 'opening';
}

function activeBids(bids: readonly Bid[] | undefined): Bid[] {
  return (bids ?? []).filter((bid) => bid.active !== false);
}

/** Oferta minima: la salida si nadie pujo; si no, el precio actual mas el incremento. */
export function nextMinimumBid(auction: Pick<Auction, 'startPrice' | 'currentPrice' | 'minIncrement' | 'bids'>): number {
  const current = Math.round(Number(auction.currentPrice));
  const start = Math.round(Number(auction.startPrice));
  const increment = Math.round(Number(auction.minIncrement));
  return activeBids(auction.bids).length === 0 ? Math.max(start, current) : current + increment;
}

/** Sugerencias rapidas de oferta: la minima y dos saltos mas, en incrementos. */
export function quickBids(minimum: number, increment: number): number[] {
  const step = Math.max(1, Math.round(increment));
  return [minimum, minimum + step * 2, minimum + step * 5];
}

/** Como se nombra a un postor: quien mira, o un numero por orden de llegada. */
export type BidderLabel = { kind: 'you' } | { kind: 'bidder'; number: number };

/**
 * Nombre visible de cada postor sin revelar quien es: "tu" para quien mira y
 * postor 1, 2... por orden de su primera puja en la sala. El texto lo pone el
 * componente en el idioma activo.
 */
export function bidderLabels(bids: readonly Bid[], viewerId: string | null): Map<string, BidderLabel> {
  const labels = new Map<string, BidderLabel>();
  let next = 1;
  const ordered = [...bids].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const bid of ordered) {
    if (labels.has(bid.bidderId)) {
      continue;
    }
    if (bid.bidderId === viewerId) {
      labels.set(bid.bidderId, { kind: 'you' });
    } else {
      labels.set(bid.bidderId, { kind: 'bidder', number: next });
      next += 1;
    }
  }
  return labels;
}

/** Agrega una puja recibida en vivo sin duplicarla y deja la lista de la mas reciente a la mas antigua. */
export function mergeBid(bids: readonly Bid[], incoming: Bid): Bid[] {
  const merged = bids.some((bid) => bid.id === incoming.id) ? [...bids] : [...bids, incoming];
  return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
