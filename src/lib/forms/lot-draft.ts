import type { LotInput } from '@/lib/api/client';
import type { Lot } from '@/lib/api/types';
import type { FieldErrors } from './validators';

// Ficha de una obra mientras se edita: lo que escribe la persona, tal cual, y
// como pasa a la peticion. Funciones puras, sin React ni red.

export type Representation = 'TWO_D' | 'THREE_D';
export type Destination = 'CATALOG' | 'PERSONAL';
export type Visibility = 'PUBLIC' | 'PRIVATE';

export interface Draft {
  title: string;
  description: string;
  materials: string;
  artistName: string;
  year: string;
  categorySlug: string;
  representation: Representation;
  widthCm: string;
  heightCm: string;
  depthCm: string;
  provenance: string;
}

export type LotField = 'title' | 'description' | 'materials' | 'year' | 'width' | 'height' | 'depth' | 'provenance' | 'image' | 'model';

/** Solo digitos (año). */
export const digits = (raw: string) => raw.replace(/\D+/g, '').slice(0, 4);

/** Medida en centimetros: digitos y un decimal opcional. */
export const measure = (raw: string) => {
  const [whole = '', ...rest] = raw.replace(/,/g, '.').replace(/[^\d.]+/g, '').split('.');
  return rest.length > 0 ? `${whole.slice(0, 4)}.${rest.join('').slice(0, 1)}` : whole.slice(0, 4);
};

type Dimension = 'width' | 'height' | 'depth';

/** Problemas de la ficha: claves del diccionario Publish.problems. */
export type LotProblem =
  | 'titleShort'
  | 'descriptionShort'
  | 'materialsRequired'
  | 'yearRange'
  | `${Dimension}Required`
  | `${Dimension}Range`
  | 'provenanceShort'
  | 'imageRequired'
  | 'modelRequired';

export function sizeError(value: string, dimension: Dimension): LotProblem | undefined {
  const parsed = Number(value);
  if (value === '') {
    return `${dimension}Required`;
  }
  return parsed > 0 && parsed <= 2000 ? undefined : `${dimension}Range`;
}

/** Medida guardada ("30.00") como la escribiria la persona ("30"). */
export function storedMeasure(value: string | null | undefined): string {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '';
}

/**
 * Ficha que se edita. Se parte siempre del texto del autor: una obra publica
 * puede llegar traducida y guardar la traduccion sobrescribiria el original.
 */
export function draftFrom(lot: Lot | null): Draft {
  const texts = lot?.original ?? lot;
  return {
    title: texts?.title ?? '',
    description: texts?.description ?? '',
    materials: texts?.materials ?? '',
    artistName: lot?.artistName ?? '',
    year: lot?.creationYear ? String(lot.creationYear) : '',
    categorySlug: lot?.categories?.find((link) => link.isPrimary)?.category.slug ?? '',
    representation: lot?.representationKind === 'THREE_D' ? 'THREE_D' : 'TWO_D',
    widthCm: storedMeasure(lot?.widthCm),
    heightCm: storedMeasure(lot?.heightCm),
    depthCm: storedMeasure(lot?.depthCm),
    provenance: texts?.provenance ?? '',
  };
}

export function inputFrom(draft: Draft): LotInput {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    materials: draft.materials.trim(),
    artistName: draft.artistName.trim() || undefined,
    creationYear: draft.year ? Number(draft.year) : undefined,
    categorySlug: draft.categorySlug,
    representationKind: draft.representation,
    widthCm: Number(draft.widthCm),
    heightCm: Number(draft.heightCm),
    depthCm: draft.representation === 'THREE_D' ? Number(draft.depthCm) : undefined,
    provenance: draft.provenance.trim() || undefined,
  };
}

/** Si algun campo de la ficha cambio respecto de como se abrio. */
export function draftChanged(draft: Draft, initial: Draft): boolean {
  return (Object.keys(initial) as Array<keyof Draft>).some((key) => draft[key] !== initial[key]);
}

/**
 * Errores de la ficha. La imagen guardada sirve al editar, y una obra
 * tridimensional solo se muestra con su modelo real, no con la foto.
 */
export function lotErrors(draft: Draft, context: { currentYear: number; hasImage: boolean; hasModel: boolean }): FieldErrors<LotField, LotProblem> {
  const threeD = draft.representation === 'THREE_D';
  return {
    title: draft.title.trim().length >= 3 ? undefined : 'titleShort',
    description: draft.description.trim().length >= 10 ? undefined : 'descriptionShort',
    materials: draft.materials.trim().length >= 2 ? undefined : 'materialsRequired',
    year:
      draft.year === '' || (Number(draft.year) >= 1 && Number(draft.year) <= context.currentYear)
        ? undefined
        : 'yearRange',
    width: sizeError(draft.widthCm, 'width'),
    height: sizeError(draft.heightCm, 'height'),
    depth: threeD ? sizeError(draft.depthCm, 'depth') : undefined,
    provenance: draft.provenance.trim() === '' || draft.provenance.trim().length >= 3 ? undefined : 'provenanceShort',
    image: context.hasImage ? undefined : 'imageRequired',
    model: !threeD || context.hasModel ? undefined : 'modelRequired',
  };
}
