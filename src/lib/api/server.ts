import { artApi, publicApiUrl } from './client';
import type { CatalogPage, Category, GalleryItem, Lot } from './types';

export async function getPublicLots(query = ''): Promise<{ catalog: CatalogPage; error: string | null }> {
  try {
    const response = await fetch(`${serverApiUrl()}/lots${query}`, {
      next: { revalidate: 60, tags: ['catalog'] },
    });
    if (!response.ok) {
      return { catalog: { items: [], total: 0, page: 1, pageSize: 12 }, error: 'El catálogo no está disponible.' };
    }
    return { catalog: (await response.json()) as CatalogPage, error: null };
  } catch {
    return { catalog: { items: [], total: 0, page: 1, pageSize: 12 }, error: 'No hay conexión con la sala.' };
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
    const response = await fetch(`${serverApiUrl()}/lots/${id}`, { cache: 'no-store' });
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

function serverApiUrl(): string {
  return process.env['API_INTERNAL_URL'] ?? publicApiUrl();
}

export { artApi };
