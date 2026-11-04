import type { Metadata } from 'next';
import { PurchasedSheetView } from './purchased-sheet-view';

export const metadata: Metadata = { title: 'Ficha de la obra' };

/**
 * Ficha guardada de una obra comprada. Al venderse, el catalogo deja de
 * publicar la ficha original; la galeria de quien la compro conserva una copia.
 */
export default async function PurchasedSheetPage({ params }: { params: Promise<{ ownerId: string; lotId: string }> }) {
  const { ownerId, lotId } = await params;
  return <PurchasedSheetView ownerId={ownerId} lotId={lotId} />;
}
