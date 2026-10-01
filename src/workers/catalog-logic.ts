export interface CatalogLot {
  id: string;
  title: string;
  artistName: string | null;
  materials: string;
  status: string;
  authenticityScore: number | null;
  visibility: string;
  sellerId: string;
}

export interface CatalogQuery {
  version: 1;
  text: string;
  status: string;
  sort: 'recent' | 'title' | 'score';
}

export function filterCatalog<T extends CatalogLot>(lots: readonly T[], query: CatalogQuery): T[] {
  const text = query.text.trim().toLowerCase();
  const visible = lots.filter((lot) => {
    if (lot.visibility !== 'PUBLIC') {
      return false;
    }
    if (query.status && lot.status !== query.status) {
      return false;
    }
    if (!text) {
      return true;
    }
    const haystack = `${lot.title} ${lot.artistName ?? ''} ${lot.materials}`.toLowerCase();
    return haystack.includes(text);
  });
  if (query.sort === 'title') {
    return visible.sort((left, right) => left.title.localeCompare(right.title, 'es'));
  }
  if (query.sort === 'score') {
    return visible.sort((left, right) => (right.authenticityScore ?? -1) - (left.authenticityScore ?? -1));
  }
  return visible;
}
