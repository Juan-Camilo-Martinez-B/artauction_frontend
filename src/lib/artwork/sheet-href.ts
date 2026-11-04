import type { Lot } from '@/lib/api/types';

/** Ficha guardada de una obra comprada, en la galeria de su duena. */
export function purchasedSheetHref(ownerId: string, lotId: string): string {
  return `/galerias/${ownerId}/obras/${lotId}`;
}

/**
 * Ficha completa de una obra de la galeria de `ownerId`. Una obra vendida ya no
 * se publica en el catalogo: si es de esta galeria es porque la gano, y su
 * ficha es la que guardo la galeria al comprarla.
 */
export function sheetHref(lot: Pick<Lot, 'id' | 'status'>, ownerId: string): string {
  return lot.status === 'VENDIDA' ? purchasedSheetHref(ownerId, lot.id) : `/obras/${lot.id}`;
}
