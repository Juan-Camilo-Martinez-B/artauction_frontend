import { describe, expect, it } from 'vitest';
import type { Lot } from '@/lib/api/types';
import { digits, draftChanged, draftFrom, inputFrom, lotErrors, measure, type Draft } from '@/lib/forms/lot-draft';

const SCULPTURE: Draft = {
  title: 'Estatua de pie',
  description: 'Figura de tamaño natural en mármol.',
  materials: 'Mármol',
  artistName: '',
  year: '',
  categorySlug: 'escultura',
  representation: 'THREE_D',
  widthCm: '55',
  heightCm: '170',
  depthCm: '30',
  provenance: '',
};
const CONTEXT = { currentYear: 2026, hasImage: true, hasModel: true };

describe('ficha de una obra', () => {
  it('limpia lo que se escribe en el año y las medidas', () => {
    expect(digits('19a25x7')).toBe('1925');
    expect(measure('30,55 cm')).toBe('30.5');
    expect(measure('123456')).toBe('1234');
  });

  it('pasa la ficha a la peticion: recorta textos y solo manda fondo si es un objeto', () => {
    const input = inputFrom({ ...SCULPTURE, title: '  Estatua  ', year: '1900', provenance: ' ' });
    expect(input).toMatchObject({ title: 'Estatua', creationYear: 1900, representationKind: 'THREE_D', widthCm: 55, heightCm: 170, depthCm: 30 });
    expect(input.provenance).toBeUndefined();
    expect(inputFrom({ ...SCULPTURE, representation: 'TWO_D' }).depthCm).toBeUndefined();
  });

  it('abre una obra guardada con sus medidas como las escribiria la persona', () => {
    const lot = { title: 'Jarrón', description: 'd', materials: 'Cerámica', artistName: null, creationYear: 1910, representationKind: 'THREE_D', widthCm: '30.00', heightCm: '45.50', depthCm: null, provenance: null } as unknown as Lot;
    const draft = draftFrom(lot);
    expect(draft).toMatchObject({ year: '1910', representation: 'THREE_D', widthCm: '30', heightCm: '45.5', depthCm: '' });
    expect(draftChanged(draft, draftFrom(lot))).toBe(false);
    expect(draftChanged({ ...draft, title: 'Otro' }, draft)).toBe(true);
  });

  it('una obra tridimensional exige su modelo 3D; una plana, no', () => {
    expect(lotErrors(SCULPTURE, { ...CONTEXT, hasModel: false }).model).toBe('Sube el modelo 3D de la obra.');
    expect(lotErrors(SCULPTURE, CONTEXT).model).toBeUndefined();
    expect(lotErrors({ ...SCULPTURE, representation: 'TWO_D' }, { ...CONTEXT, hasModel: false }).model).toBeUndefined();
  });

  it('valida medidas, año, imagen y la profundidad solo de los objetos', () => {
    const errors = lotErrors({ ...SCULPTURE, widthCm: '', heightCm: '2500', depthCm: '', year: '2099' }, { ...CONTEXT, hasImage: false });
    expect(errors.width).toBe('Escribe el ancho.');
    expect(errors.height).toMatch(/entre 0,1 y 2000 cm/);
    expect(errors.depth).toBe('Escribe la profundidad.');
    expect(errors.year).toMatch(/entre 1 y 2026/);
    expect(errors.image).toBe('Elige la imagen de la obra.');
    expect(lotErrors({ ...SCULPTURE, representation: 'TWO_D', depthCm: '' }, CONTEXT).depth).toBeUndefined();
  });
});
