import { artApi, publicApiUrl } from './client';
import type { GalleryItem, Lot } from './types';

export async function getPublicLots(): Promise<{ lots: Lot[]; error: string | null }> {
  try {
    const response = await fetch(`${serverApiUrl()}/lots`, {
      next: { revalidate: 60, tags: ['catalog'] },
    });
    if (!response.ok) {
      return { lots: [], error: 'El catálogo no está disponible.' };
    }
    return { lots: (await response.json()) as Lot[], error: null };
  } catch {
    return { lots: [], error: 'No hay conexión con la sala.' };
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
