'use client';

import type { SilhouetteResult } from '@/workers/silhouette.worker';

/**
 * Como se expone un objeto 3D a partir de su foto:
 * - lathe: solido de revolucion con el perfil de la silueta (jarrones, copas);
 * - cutout: la foto recortada, dentro de una vitrina;
 * - photo: la foto sin recortar, cuando el analisis no es posible.
 * Un proveedor futuro (por ejemplo, IA de imagen a 3D) podria devolver un modelo
 * GLB sin que la escena cambie: basta otra implementacion de ObjectModelProvider.
 */
export type ObjectModel =
  | { kind: 'lathe'; profile: Array<[number, number]>; aspect: number; image: ImageBitmap }
  | { kind: 'cutout'; aspect: number; image: ImageBitmap }
  | { kind: 'photo' };

export interface ObjectModelProvider {
  resolve(imageUrl: string): Promise<ObjectModel>;
}

type Pending = { resolve: (model: ObjectModel) => void };

/** Analiza la silueta en un worker y guarda el resultado por URL durante la sesion. */
export class SilhouetteModelProvider implements ObjectModelProvider {
  private worker: Worker | null = null;
  private nextId = 0;
  private readonly pending = new Map<number, Pending>();
  private readonly cache = new Map<string, Promise<ObjectModel>>();

  resolve(imageUrl: string): Promise<ObjectModel> {
    const cached = this.cache.get(imageUrl);
    if (cached) {
      return cached;
    }
    const model = new Promise<ObjectModel>((resolve) => {
      const worker = this.ensureWorker();
      if (!worker) {
        resolve({ kind: 'photo' });
        return;
      }
      this.nextId += 1;
      this.pending.set(this.nextId, { resolve });
      worker.postMessage({ version: 1, type: 'analyze', requestId: this.nextId, url: imageUrl });
    });
    this.cache.set(imageUrl, model);
    return model;
  }

  private ensureWorker(): Worker | null {
    if (this.worker) {
      return this.worker;
    }
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      return null;
    }
    const worker = new Worker(new URL('../../workers/silhouette.worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent<SilhouetteResult | { type: 'error'; requestId: number }>) => {
      const waiting = this.pending.get(event.data.requestId);
      if (!waiting) {
        return;
      }
      this.pending.delete(event.data.requestId);
      const data = event.data;
      if (data.type !== 'analyzed') {
        waiting.resolve({ kind: 'photo' });
        return;
      }
      waiting.resolve(
        data.kind === 'lathe' && data.profile
          ? { kind: 'lathe', profile: data.profile, aspect: data.aspect, image: data.bitmap }
          : { kind: 'cutout', aspect: data.aspect, image: data.bitmap },
      );
    };
    this.worker = worker;
    return worker;
  }
}

let shared: ObjectModelProvider | null = null;

/** Proveedor de la sesion: un solo worker y una sola cache para todas las salas. */
export function objectModelProvider(): ObjectModelProvider {
  shared ??= new SilhouetteModelProvider();
  return shared;
}
