import { describe, expect, it } from 'vitest';
import { filterCatalog, type CatalogLot } from '@/workers/catalog-logic';

const lots: CatalogLot[] = [
  {
    id: '1',
    title: 'Reloj de mesa',
    artistName: 'Taller anónimo',
    materials: 'bronce',
    status: 'EN_SUBASTA',
    authenticityScore: 80,
    visibility: 'PUBLIC',
    sellerId: 'seller',
  },
  {
    id: '2',
    title: 'Boceto',
    artistName: 'Nora',
    materials: 'grafito',
    status: 'BORRADOR',
    authenticityScore: null,
    visibility: 'PRIVATE',
    sellerId: 'seller',
  },
];

describe('filtro del catálogo', () => {
  it('deja fuera una obra privada aunque venga en la lista', () => {
    const visible = filterCatalog(lots, { version: 1, text: '', status: '', sort: 'recent' });
    expect(visible.map((lot) => lot.id)).toEqual(['1']);
  });

  it('busca por material y ordena por score', () => {
    const first = lots[0];
    if (!first) {
      throw new Error('falta el lote de prueba');
    }
    const extra: CatalogLot = {
      ...first,
      id: '3',
      title: 'Copa',
      materials: 'bronce',
      authenticityScore: 91,
    };
    const visible = filterCatalog([extra, first], { version: 1, text: 'bronce', status: 'EN_SUBASTA', sort: 'score' });
    expect(visible.map((lot) => lot.id)).toEqual(['3', '1']);
  });
});
