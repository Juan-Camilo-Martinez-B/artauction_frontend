import { describe, expect, it } from 'vitest';
import type { GalleryItem, Lot } from '@/lib/api/types';
import { applyFilter, canHang, collectWorks, countByFilter, filterOf, parseFilter } from '@/lib/artwork/my-works';
import { auditSourceLabel, isEditable } from '@/lib/artwork/lot-review';
import { canSell } from '@/lib/session/roles';
import { sectionsFor } from '@/components/account/account-menu';

function lot(id: string, status: string, extra: Partial<Lot> = {}): Lot {
  return {
    id,
    sellerId: 's1',
    title: id,
    description: '',
    artistName: null,
    creationYear: null,
    materials: '',
    status,
    visibility: 'PRIVATE',
    authenticityScore: null,
    suggestedPriceMin: null,
    suggestedPriceMax: null,
    currency: 'ARC',
    ...extra,
  };
}

function item(lotId: string, source: GalleryItem['source']): GalleryItem {
  return { ownerId: 's1', lotId, source, visibility: 'PRIVATE', title: lotId, artistName: null, imageKeys: [], acquiredAt: '2026-11-03T00:00:00Z' };
}

const returned = lot('devuelta', 'BORRADOR', { lastReview: { decision: 'RETURN_TO_DRAFT', reason: 'Corrige el año declarado.', createdAt: null } });

describe('mis obras', () => {
  it('cada obra cae en una sola etiqueta', () => {
    expect(filterOf({ kind: 'published', lot: returned })).toBe('devueltas');
    expect(filterOf({ kind: 'published', lot: lot('b', 'BORRADOR') })).toBe('borrador');
    expect(filterOf({ kind: 'published', lot: lot('p', 'PUBLICADA') })).toBe('publicada');
    const scheduled = lot('s', 'PUBLICADA', { auction: { id: 'a', status: 'PROGRAMADA', currentPrice: '10', endsAt: '' } });
    expect(filterOf({ kind: 'published', lot: scheduled })).toBe('subasta');
    expect(filterOf({ kind: 'published', lot: lot('v', 'VENDIDA') })).toBe('vendida');
    expect(filterOf({ kind: 'published', lot: lot('c', 'CERRADO') })).toBe('cerrada');
    expect(filterOf({ kind: 'published', lot: lot('own', 'PERSONAL') })).toBe('proyectos');
    expect(filterOf({ kind: 'acquired', item: item('g', 'GANADA') })).toBe('ganadas');
  });

  it('une lo creado y lo ganado sin repetir lo que la galeria registra como propio', () => {
    const works = collectWorks([lot('p', 'PUBLICADA'), returned, lot('own', 'PERSONAL')], [item('p', 'PROPIA'), item('own', 'PROYECTO'), item('g', 'GANADA')]);
    expect(works).toHaveLength(4);
    expect(countByFilter(works).get('proyectos')).toBe(1);
    const counts = countByFilter(works);
    expect(counts.get('todas')).toBe(4);
    expect(counts.get('publicada')).toBe(1);
    expect(counts.get('ganadas')).toBe(1);
    // Las devueltas van primero porque piden algo a la persona.
    expect(applyFilter(works, 'todas')[0]).toMatchObject({ kind: 'published', lot: { id: 'devuelta' } });
    expect(applyFilter(works, 'ganadas')).toHaveLength(1);
  });

  it('un filtro desconocido en la URL muestra todas', () => {
    expect(parseFilter('devueltas')).toBe('devueltas');
    expect(parseFilter('<script>')).toBe('todas');
    expect(parseFilter(null)).toBe('todas');
  });

  it('mis obras reemplaza a mi coleccion para todos los roles', () => {
    for (const role of ['USER', 'SELLER', 'ADMIN']) {
      const hrefs = sectionsFor(role).map((entry) => entry.href);
      expect(hrefs).toContain('/mis-obras');
      expect(hrefs).not.toContain('/galeria');
    }
  });

  it('solo se cuelga lo propio: lo vendido ya es de quien lo gano', () => {
    expect(canHang({ kind: 'published', lot: lot('own', 'PERSONAL') })).toBe(true);
    expect(canHang({ kind: 'published', lot: lot('p', 'PUBLICADA') })).toBe(true);
    expect(canHang({ kind: 'published', lot: lot('v', 'VENDIDA') })).toBe(false);
    expect(canHang({ kind: 'acquired', item: item('g', 'GANADA') })).toBe(true);
  });

  it('un proyecto propio se edita siempre, se marca sin auditar y lo crea cualquier cuenta', () => {
    expect(isEditable(lot('own', 'PERSONAL'))).toBe(true);
    expect(isEditable(lot('p', 'PUBLICADA'))).toBe(false);
    expect(auditSourceLabel({ modelName: 'modelo-x' }, lot('own', 'PERSONAL'))).toBe('Proyecto propio, sin auditar');
    expect(canSell('USER')).toBe(false);
    expect(canSell('SELLER')).toBe(true);
  });
});
