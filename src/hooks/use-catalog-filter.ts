'use client';

import { useEffect, useState } from 'react';
import { filterCatalog, type CatalogLot, type CatalogQuery } from '@/workers/catalog-logic';

export function useCatalogFilter<T extends CatalogLot>(lots: readonly T[], query: CatalogQuery): T[] {
  const [filtered, setFiltered] = useState<T[]>(() => filterCatalog(lots, query));

  useEffect(() => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../workers/catalog.worker.ts', import.meta.url));
    } catch {
      setFiltered(filterCatalog(lots, query));
      return undefined;
    }
    const requestId = Date.now();
    const onMessage = (event: MessageEvent<{ requestId: number; lots: T[] }>) => {
      if (event.data.requestId === requestId) {
        setFiltered(event.data.lots);
      }
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ version: 1, type: 'filter', requestId, lots, query });
    return () => {
      worker.removeEventListener('message', onMessage);
      worker.terminate();
    };
  }, [lots, query]);

  return filtered;
}
