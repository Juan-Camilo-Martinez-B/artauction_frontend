import type { GalleryConfig } from '@/lib/api/types';

/** Sala de partida cuando la galeria aun no se personalizo: yeso calido y parque. */
export const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  schemaVersion: 1,
  source: 'manual',
  identity: { styleName: 'Sin personalizar', summary: '', artStyles: [] },
  architecture: { spaceType: 'MINIMAL', roomWidth: 12, roomDepth: 10, roomHeight: 4, zones: 1 },
  palette: { wall: '#efe8dc', floor: '#cbbba6', ceiling: '#f6f1e8', accent: '#7a2e24', pedestal: '#e9e2d4' },
  materials: { wall: 'plaster', floor: 'wood', sculptureSupport: 'pedestal' },
  lighting: { ambientIntensity: 0.45, colorTemperature: 3500, spotIntensity: 0.6, mood: 'serenidad' },
  navigation: { tour: 'libre', approach: 'ficha', motion: 'default' },
};

/** Materiales que se pueden elegir; el nombre esta en el diccionario Studio.ambience. */
export const WALL_MATERIAL_OPTIONS = ['plaster', 'marble', 'concrete', 'wood', 'metal'] as const satisfies ReadonlyArray<GalleryConfig['materials']['wall']>;

export const FLOOR_MATERIAL_OPTIONS = ['wood', 'stone', 'concrete', 'marble'] as const satisfies ReadonlyArray<GalleryConfig['materials']['floor']>;

/** Dos configuraciones son iguales si coinciden campo a campo (el orden de claves es estable). */
export function sameConfig(left: GalleryConfig | null, right: GalleryConfig | null): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
