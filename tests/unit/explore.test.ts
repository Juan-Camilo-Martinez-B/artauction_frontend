import { describe, expect, it } from 'vitest';
import { exploreHref, explorePages, isGalleryOwnerId, parseExplorePage, parseExploreSort } from '@/lib/social/explore';

describe('explorar galerias', () => {
  it('un orden desconocido cae en el orden por omision', () => {
    expect(parseExploreSort('popular')).toBe('popular');
    expect(parseExploreSort('recent')).toBe('recent');
    expect(parseExploreSort('otra-cosa')).toBe('recent');
    expect(parseExploreSort(undefined)).toBe('recent');
  });

  it('una pagina invalida cae en la primera', () => {
    expect(parseExplorePage('3')).toBe(3);
    for (const raw of ['0', '-1', '1.5', 'abc', undefined]) {
      expect(parseExplorePage(raw)).toBe(1);
    }
  });

  it('el enlace omite lo que ya es el valor por omision', () => {
    expect(exploreHref('recent')).toBe('/explorar');
    expect(exploreHref('popular')).toBe('/explorar?orden=popular');
    expect(exploreHref('recent', 2)).toBe('/explorar?pagina=2');
    expect(exploreHref('popular', 2)).toBe('/explorar?orden=popular&pagina=2');
  });

  it('cuenta las paginas sin bajar de una', () => {
    expect(explorePages(0)).toBe(1);
    expect(explorePages(12)).toBe(1);
    expect(explorePages(13)).toBe(2);
  });

  it('solo acepta identificadores con forma de uuid', () => {
    expect(isGalleryOwnerId('d9a99275-0001-4d60-922a-63eaada7ed2c')).toBe(true);
    expect(isGalleryOwnerId('undefined')).toBe(false);
  });
});
