// Compartido por componentes de servidor y de cliente: no lleva 'use client'.

/** URL del catalogo con sus filtros; sin filtros, /catalogo a secas. */
export function catalogHref(filters: { category?: string; query?: string; representation?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.query) params.set('q', filters.query);
  if (filters.representation) params.set('representation', filters.representation);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  const text = params.toString();
  return text ? `/catalogo?${text}` : '/catalogo';
}
