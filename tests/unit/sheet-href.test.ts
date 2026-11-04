import { describe, expect, it } from 'vitest';
import { purchasedSheetHref, sheetHref } from '@/lib/artwork/sheet-href';

describe('ficha completa de una obra de la galeria', () => {
  it('una obra vendida abre la ficha guardada en la galeria de su duena', () => {
    expect(sheetHref({ id: 'l1', status: 'VENDIDA' }, 'o1')).toBe('/galerias/o1/obras/l1');
    expect(purchasedSheetHref('o1', 'l1')).toBe('/galerias/o1/obras/l1');
  });

  it('las demas abren la ficha del catalogo', () => {
    expect(sheetHref({ id: 'l1', status: 'PUBLICADA' }, 'o1')).toBe('/obras/l1');
    expect(sheetHref({ id: 'l1', status: 'PERSONAL' }, 'o1')).toBe('/obras/l1');
  });
});
