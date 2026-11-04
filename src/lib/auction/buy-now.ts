import type { Auction } from '@/lib/api/types';

/**
 * La compra inmediata se ofrece mientras el precio no llegue a esta fraccion de
 * su valor. Es la misma regla de auction-service (BUY_NOW_AVAILABLE_RATIO): el
 * servidor la vuelve a comprobar al comprar; aqui sirve para que la sala la
 * oculte en cuanto una puja en vivo la supera, sin recargar.
 */
export const BUY_NOW_AVAILABLE_RATIO = 0.8;

/** Precio desde el que la compra inmediata deja de ofrecerse. */
export function buyNowThreshold(buyNowPrice: string | number): number {
  return Number(buyNowPrice) * BUY_NOW_AVAILABLE_RATIO;
}

/** Sala abierta, sin vencer y con el precio por debajo del umbral. */
export function buyNowOpen(auction: Pick<Auction, 'status' | 'endsAt' | 'currentPrice' | 'buyNowPrice'>, nowMs: number): boolean {
  if (!auction.buyNowPrice) {
    return false;
  }
  return auction.status === 'ACTIVA' && nowMs < Date.parse(auction.endsAt) && Number(auction.currentPrice) < buyNowThreshold(auction.buyNowPrice);
}
