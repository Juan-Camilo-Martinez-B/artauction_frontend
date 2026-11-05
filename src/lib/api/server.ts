import { requestLocale } from '@/i18n/request';
import { artApi, publicApiUrl } from './client';
import type { CatalogPage, Category, GalleryItem, Lot } from './types';

/** Por que no hay catalogo: el gateway respondio con error o no hubo conexion. La pagina lo traduce. */
export type CatalogError = 'unavailable' | 'offline';

export async function getPublicLots(query = ''): Promise<{ catalog: CatalogPage; error: CatalogError | null }> {
  try {
    const response = await fetch(`${serverApiUrl()}/lots${query}`, {
      // El idioma va en la cabecera: la cache de Next guarda una respuesta por idioma.
      headers: await localeHeaders(),
      next: { revalidate: 60, tags: ['catalog'] },
    });
    if (!response.ok) {
      return { catalog: { items: [], total: 0, page: 1, pageSize: 12 }, error: 'unavailable' };
    }
    return { catalog: (await response.json()) as CatalogPage, error: null };
  } catch {
    return { catalog: { items: [], total: 0, page: 1, pageSize: 12 }, error: 'offline' };
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${serverApiUrl()}/lots/categories`, {
      next: { revalidate: 60, tags: ['catalog'] },
    });
    if (!response.ok) {
      return [];
    }
    return (await response.json()) as Category[];
  } catch {
    return [];
  }
}

export async function getLot(id: string): Promise<Lot | null> {
  try {
    const response = await fetch(`${serverApiUrl()}/lots/${id}`, { cache: 'no-store', headers: await localeHeaders() });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Lot;
  } catch {
    return null;
  }
}

export async function getPublicGallery(ownerId: string): Promise<GalleryItem[]> {
  try {
    const response = await fetch(`${serverApiUrl()}/galleries/${ownerId}`, {
      next: { revalidate: 60, tags: ['gallery', `gallery:${ownerId}`] },
    });
    if (!response.ok) {
      return [];
    }
    const items = (await response.json()) as GalleryItem[];
    return items.filter((item) => item.visibility === 'PUBLIC');
  } catch {
    return [];
  }
}

/** El gateway devuelve las fichas en el idioma de quien mira la pagina. */
async function localeHeaders(): Promise<Record<string, string>> {
  return { 'accept-language': await requestLocale() };
}

function serverApiUrl(): string {
  return process.env['API_INTERNAL_URL'] ?? publicApiUrl();
}

export { artApi };
