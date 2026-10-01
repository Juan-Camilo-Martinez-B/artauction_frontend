/// <reference lib="webworker" />
import { filterCatalog, type CatalogLot, type CatalogQuery } from './catalog-logic';

interface CatalogRequest {
  version: 1;
  type: 'filter';
  requestId: number;
  lots: CatalogLot[];
  query: CatalogQuery;
}

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = (event: MessageEvent<unknown>) => {
  const message = readRequest(event.data);
  if (!message) {
    return;
  }
  const lots = filterCatalog(message.lots, message.query);
  scope.postMessage({ version: 1, type: 'filtered', requestId: message.requestId, lots });
};

function readRequest(value: unknown): CatalogRequest | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  if (!('type' in value) || value.type !== 'filter' || !('version' in value) || value.version !== 1) {
    return null;
  }
  if (!('requestId' in value) || typeof value.requestId !== 'number' || !('lots' in value) || !('query' in value)) {
    return null;
  }
  if (!Array.isArray(value.lots) || typeof value.query !== 'object' || value.query === null) {
    return null;
  }
  return {
    version: 1,
    type: 'filter',
    requestId: value.requestId,
    lots: value.lots as CatalogLot[],
    query: value.query as CatalogQuery,
  };
}
