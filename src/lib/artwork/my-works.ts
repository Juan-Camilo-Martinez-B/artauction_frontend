import type { GalleryItem, Lot } from '@/lib/api/types';
import { isReturned } from './lot-review';

// "Mis obras" reune en una sola lista lo que la persona publico (catalogo, con
// su estado) y lo que adquirio (galeria: ganadas en subasta o anadidas como
// prueba). Las obras propias de la galeria no se repiten: ya estan en el
// catalogo con mas detalle.

export type MyWork = { kind: 'published'; lot: Lot } | { kind: 'acquired'; item: GalleryItem };

export type WorkFilter =
  | 'todas'
  | 'devueltas'
  | 'borrador'
  | 'auditoria'
  | 'revision'
  | 'publicada'
  | 'subasta'
  | 'vendida'
  | 'cerrada'
  | 'ganadas'
  | 'anadidas';

export interface FilterGroup {
  label: string;
  filters: ReadonlyArray<{ key: WorkFilter; label: string }>;
}

/** Orden y nombre de los filtros; el primer grupo solo existe para quien vende. */
export const PUBLISHED_FILTERS: FilterGroup = {
  label: 'Publicadas por mí',
  filters: [
    { key: 'devueltas', label: 'Devueltas' },
    { key: 'borrador', label: 'Borrador' },
    { key: 'auditoria', label: 'En auditoría' },
    { key: 'revision', label: 'Revisión manual' },
    { key: 'publicada', label: 'Publicada' },
    { key: 'subasta', label: 'En subasta' },
    { key: 'vendida', label: 'Vendida' },
    { key: 'cerrada', label: 'Cerrada sin venta' },
  ],
};

export const ACQUIRED_FILTERS: FilterGroup = {
  label: 'Adquiridas',
  filters: [
    { key: 'ganadas', label: 'Ganadas en subasta' },
    { key: 'anadidas', label: 'Añadidas como prueba' },
  ],
};

const ALL_FILTERS = new Set<string>(['todas', ...[PUBLISHED_FILTERS, ACQUIRED_FILTERS].flatMap((group) => group.filters.map((filter) => filter.key))]);

/** Lee el filtro de la URL; cualquier valor desconocido muestra todas. */
export function parseFilter(raw: string | null | undefined): WorkFilter {
  return raw && ALL_FILTERS.has(raw) ? (raw as WorkFilter) : 'todas';
}

function liveAuction(lot: Lot): boolean {
  return lot.auction?.status === 'ACTIVA' || lot.auction?.status === 'PROGRAMADA';
}

/** Etiqueta de una obra; cada obra cae en exactamente una. */
export function filterOf(work: MyWork): Exclude<WorkFilter, 'todas'> {
  if (work.kind === 'acquired') {
    return work.item.source === 'GANADA' ? 'ganadas' : 'anadidas';
  }
  const { lot } = work;
  if (isReturned(lot)) {
    return 'devueltas';
  }
  switch (lot.status) {
    case 'BORRADOR':
      return 'borrador';
    case 'PENDIENTE_AUDITORIA':
      return 'auditoria';
    case 'REVISION_MANUAL':
      return 'revision';
    case 'EN_SUBASTA':
      return 'subasta';
    case 'VENDIDA':
      return 'vendida';
    case 'CERRADO':
      return 'cerrada';
    default:
      // Publicada o aprobada: si ya tiene sala abierta o programada, esta en subasta.
      return liveAuction(lot) ? 'subasta' : 'publicada';
  }
}

/** Une lo publicado y lo adquirido, sin repetir las obras propias de la galeria. */
export function collectWorks(lots: readonly Lot[], items: readonly GalleryItem[]): MyWork[] {
  return [
    ...lots.map((lot): MyWork => ({ kind: 'published', lot })),
    ...items.filter((item) => item.source !== 'PROPIA').map((item): MyWork => ({ kind: 'acquired', item })),
  ];
}

export function countByFilter(works: readonly MyWork[]): Map<WorkFilter, number> {
  const counts = new Map<WorkFilter, number>([['todas', works.length]]);
  for (const work of works) {
    const key = filterOf(work);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function applyFilter(works: readonly MyWork[], filter: WorkFilter): MyWork[] {
  const shown = filter === 'todas' ? [...works] : works.filter((work) => filterOf(work) === filter);
  // Las devueltas primero: son las que piden algo a la persona.
  return shown.sort((left, right) => Number(filterOf(right) === 'devueltas') - Number(filterOf(left) === 'devueltas'));
}
