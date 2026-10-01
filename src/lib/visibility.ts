export function canShowLot(lot: { visibility: string; sellerId: string }, viewerId: string | null): boolean {
  if (lot.visibility === 'PUBLIC') {
    return true;
  }
  return viewerId !== null && viewerId === lot.sellerId;
}

export function canShowGalleryItem(item: { visibility: string; ownerId: string }, viewerId: string | null): boolean {
  if (item.visibility === 'PUBLIC') {
    return true;
  }
  return viewerId !== null && viewerId === item.ownerId;
}
