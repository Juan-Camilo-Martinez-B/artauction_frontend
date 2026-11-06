import { requestLocale } from '@/i18n/request';
import { artApi, publicApiUrl } from './client';
import { EXPLORE_PAGE_SIZE, type ExploreSort } from '@/lib/social/explore';
import type { CatalogPage, Category, GalleryItem, Lot, PublicGalleriesPage, PublicGallery } from './types';

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

/** Galerias para explorar; null si el API no respondio, para no confundirlo con una lista vacia. */
export async function getPublicGalleries(page: number, sort: ExploreSort): Promise<PublicGalleriesPage | null> {
  try {
    const query = new URLSearchParams({ page: String(page), pageSize: String(EXPLORE_PAGE_SIZE), sort });
    const response = await fetch(`${serverApiUrl()}/galleries?${query.toString()}`, { cache: 'no-store' });
    return response.ok ? ((await response.json()) as PublicGalleriesPage) : null;
  } catch {
    return null;
  }
}

/** Cabecera de una galeria; null si la persona no existe o su perfil es privado. */
export async function getGallerySummary(ownerId: string): Promise<PublicGallery | null> {
  try {
    const response = await fetch(`${serverApiUrl()}/galleries/${ownerId}/summary`, { cache: 'no-store' });
    return response.ok ? ((await response.json()) as PublicGallery) : null;
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
