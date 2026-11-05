import type { GalleryItem, Lot } from '@/lib/api/types';
import { isReturned } from './lot-review';

// "Mis obras" reune en una sola lista lo que la persona creo (proyectos propios
// y obras del catalogo, con su estado) y lo que gano en subasta. Lo propio de la
// galeria no se repite: ya esta en el catalogo con mas detalle.
// Una obra vendida sigue en la lista del autor como registro de la venta, pero
// ya no es suya: no se cuelga en su sala.

export type MyWork = { kind: 'published'; lot: Lot } | { kind: 'acquired'; item: GalleryItem };

export type WorkFilter =
  | 'todas'
  | 'devueltas'
  | 'proyectos'
  | 'borrador'
  | 'auditoria'
  | 'revision'
  | 'publicada'
  | 'subasta'
  | 'vendida'
  | 'cerrada'
  | 'ganadas';

/** Grupo de filtros; los nombres estan en el diccionario MyWorks. */
export interface FilterGroup {
  id: 'all' | 'published' | 'acquired';
  filters: readonly WorkFilter[];
}

export const ALL_FILTER: FilterGroup = { id: 'all', filters: ['todas'] };

/** Orden de los filtros; el primer grupo solo existe para quien vende. */
export const PUBLISHED_FILTERS: FilterGroup = {
  id: 'published',
  filters: ['devueltas', 'proyectos', 'borrador', 'auditoria', 'revision', 'publicada', 'subasta', 'vendida', 'cerrada'],
};

export const ACQUIRED_FILTERS: FilterGroup = { id: 'acquired', filters: ['ganadas'] };

const ALL_FILTERS = new Set<string>([ALL_FILTER, PUBLISHED_FILTERS, ACQUIRED_FILTERS].flatMap((group) => group.filters));

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
    return 'ganadas';
  }
  const { lot } = work;
  if (isReturned(lot)) {
    return 'devueltas';
  }
  switch (lot.status) {
    case 'PERSONAL':
      return 'proyectos';
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

/** Une lo creado y lo ganado, sin repetir lo que la galeria ya registra como propio. */
export function collectWorks(lots: readonly Lot[], items: readonly GalleryItem[]): MyWork[] {
  return [
    ...lots.map((lot): MyWork => ({ kind: 'published', lot })),
    ...items.filter((item) => item.source === 'GANADA').map((item): MyWork => ({ kind: 'acquired', item })),
  ];
}

/** Se cuelga en la sala lo que es de uno: todo lo creado salvo lo vendido, y lo ganado. */
export function canHang(work: MyWork): boolean {
  return work.kind === 'acquired' || work.lot.status !== 'VENDIDA';
}

export function lotIdOf(work: MyWork): string {
  return work.kind === 'published' ? work.lot.id : work.item.lotId;
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
