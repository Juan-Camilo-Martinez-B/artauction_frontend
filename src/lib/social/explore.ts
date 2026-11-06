// Reglas de la pagina Explorar, sin React: orden, paginas y enlaces.

export const EXPLORE_PAGE_SIZE = 12;

export const EXPLORE_SORTS = ['recent', 'popular'] as const;
export type ExploreSort = (typeof EXPLORE_SORTS)[number];

/** Cualquier valor que no sea un orden conocido cae en el orden por omision. */
export function parseExploreSort(raw: string | undefined): ExploreSort {
  return raw === 'popular' ? 'popular' : 'recent';
}

export function parseExplorePage(raw: string | undefined): number {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function exploreHref(sort: ExploreSort, page = 1): string {
  const query = new URLSearchParams();
  if (sort !== 'recent') {
    query.set('orden', sort);
  }
  if (page > 1) {
    query.set('pagina', String(page));
  }
  const text = query.toString();
  return text ? `/explorar?${text}` : '/explorar';
}

export function explorePages(total: number): number {
  return Math.max(1, Math.ceil(total / EXPLORE_PAGE_SIZE));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isGalleryOwnerId(value: string): boolean {
  return UUID.test(value);
}
