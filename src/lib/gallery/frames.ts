import type { Lot } from '@/lib/api/types';

/**
 * Enmarcado segun el soporte, como en un museo:
 * - obra sobre papel (acuarela, grabado, dibujo, fotografia): marco fino negro,
 *   paspartu blanco y vidrio;
 * - oleo o temple sobre lienzo o tabla: moldura dorada ancha;
 * - arte digital: marco flotante negro muy fino, sin paspartu;
 * - el resto: moldura de nogal.
 */
export interface FrameStyle {
  kind: 'paper' | 'gilded' | 'float' | 'wood';
  /** Ancho visible de la moldura, en metros. */
  width: number;
  depth: number;
  color: string;
  metalness: number;
  roughness: number;
  /** Ancho del paspartu; 0 si no lleva. */
  mat: number;
  glass: boolean;
}

const PAPER = /(papel|paper|acuarela|watercolou?r|grabado|engraving|etching|aguafuerte|litograf|lithograph|dibujo|drawing|carb[oó]n|charcoal|tinta|ink|gouache|pastel|fotograf|photograph|albumen|gelatin|print)/i;
const PAINTING = /([oó]leo|oil|temple|tempera|lienzo|canvas|tabla|panel)/i;
const DIGITAL = /(digital|impresi[oó]n giclee|giclee|nft)/i;

export function frameStyle(lot: Pick<Lot, 'materials' | 'categories'>): FrameStyle {
  const category = lot.categories?.find((link) => link.isPrimary)?.category.slug ?? '';
  const text = `${lot.materials} ${category}`;
  if (DIGITAL.test(text) || category.includes('digital')) {
    return { kind: 'float', width: 0.015, depth: 0.04, color: '#111111', metalness: 0.2, roughness: 0.5, mat: 0, glass: false };
  }
  if (PAPER.test(text) || category.includes('fotograf')) {
    return { kind: 'paper', width: 0.025, depth: 0.035, color: '#141414', metalness: 0.1, roughness: 0.55, mat: 0.08, glass: true };
  }
  if (PAINTING.test(text) || category.includes('pintura')) {
    return { kind: 'gilded', width: 0.09, depth: 0.07, color: '#d4ad55', metalness: 0.9, roughness: 0.26, mat: 0, glass: false };
  }
  return { kind: 'wood', width: 0.06, depth: 0.05, color: '#3d2a1e', metalness: 0, roughness: 0.6, mat: 0, glass: false };
}

/** Lado minimo (obra + paspartu) para que una pieza diminuta se lea desde la sala. */
const MIN_FRAMED_SIDE = 0.34;

/**
 * Las obras muy pequenas (cromos, miniaturas) se montan con un paspartu ancho,
 * como en los museos: la obra conserva su tamano real y el conjunto se ve.
 */
export function fitFrameToSize(style: FrameStyle, size: { width: number; height: number }): FrameStyle {
  const longest = Math.max(size.width, size.height);
  if (longest >= MIN_FRAMED_SIDE - 2 * style.mat) {
    return style;
  }
  return { ...style, mat: Math.max(style.mat, (MIN_FRAMED_SIDE - longest) / 2) };
}
