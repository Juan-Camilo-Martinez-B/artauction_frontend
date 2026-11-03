import type { GalleryConfig } from '@/lib/api/types';

/**
 * Materiales PBR de la sala. Cada uno apunta a una textura CC0 de
 * public/textures (ver su README) con su tamano real en metros, para repetirla
 * a escala, y su acabado. El color de la paleta tine la textura: asi la
 * personalizacion sigue mandando sobre el tono.
 */
export interface SurfaceMaterial {
  folder: string;
  /** Lado real de la textura en metros. */
  tileMeters: number;
  roughness: number;
  metalness: number;
  /** Intensidad del relieve del normal map. */
  normalScale: number;
  /** Cuanto tine la paleta (0 = color de la foto, 1 = color de la paleta). */
  tint: number;
  /**
   * Usa el color de la foto. El yeso y el concreto no: en una galeria estan
   * pintados o alisados, y las manchas del escaneo los ensuciarian; de ellos
   * solo se toma el relieve y la rugosidad.
   */
  colorMap: boolean;
}

export type WallMaterial = GalleryConfig['materials']['wall'];
export type FloorMaterial = GalleryConfig['materials']['floor'];

export const WALL_MATERIALS: Record<string, SurfaceMaterial> = {
  plaster: { folder: 'white_plaster_02', tileMeters: 1, roughness: 0.92, metalness: 0, normalScale: 0.25, tint: 1, colorMap: false },
  marble: { folder: 'marble_01', tileMeters: 1.5, roughness: 0.35, metalness: 0, normalScale: 0.2, tint: 0.35, colorMap: true },
  // Concreto alisado de galeria: del escaneo solo se toma el poro (relieve y rugosidad); el color lo da la paleta.
  concrete: { folder: 'concrete_floor_01', tileMeters: 2, roughness: 0.85, metalness: 0, normalScale: 0.55, tint: 1, colorMap: false },
  wood: { folder: 'oak_veneer_01', tileMeters: 1.83, roughness: 0.7, metalness: 0, normalScale: 0.4, tint: 0.3, colorMap: true },
  metal: { folder: 'metal_plate', tileMeters: 0.5, roughness: 0.45, metalness: 0.6, normalScale: 0.5, tint: 0.5, colorMap: true },
};

export const FLOOR_MATERIALS: Record<string, SurfaceMaterial> = {
  wood: { folder: 'wood_floor', tileMeters: 1.7, roughness: 0.55, metalness: 0, normalScale: 0.5, tint: 0.35, colorMap: true },
  stone: { folder: 'grey_cartago_01', tileMeters: 0.75, roughness: 0.7, metalness: 0, normalScale: 0.6, tint: 0.45, colorMap: true },
  concrete: { folder: 'concrete_floor_01', tileMeters: 2, roughness: 0.4, metalness: 0, normalScale: 0.45, tint: 1, colorMap: false },
  marble: { folder: 'marble_01', tileMeters: 1.5, roughness: 0.18, metalness: 0, normalScale: 0.15, tint: 0.3, colorMap: true },
};

/** Yeso fino para techo y pedestales: toman el color de la paleta casi sin textura visible. */
export const PLASTER: SurfaceMaterial = WALL_MATERIALS['plaster'] as SurfaceMaterial;

export function wallMaterial(name: string): SurfaceMaterial {
  return WALL_MATERIALS[name] ?? PLASTER;
}

export function floorMaterial(name: string): SurfaceMaterial {
  return FLOOR_MATERIALS[name] ?? (FLOOR_MATERIALS['wood'] as SurfaceMaterial);
}

export function textureUrls(material: SurfaceMaterial): { map: string; normalMap: string; roughnessMap: string } {
  const base = `/textures/${material.folder}`;
  return { map: `${base}/diff.jpg`, normalMap: `${base}/nor.jpg`, roughnessMap: `${base}/rough.jpg` };
}

/** Mezcla lineal entre blanco (sin tinte) y el color de la paleta. */
export function tintColor(paletteHex: string, amount: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(paletteHex);
  if (!match?.[1]) {
    return '#ffffff';
  }
  const value = Number.parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const mixed = channels.map((channel) => Math.round(255 + (channel - 255) * Math.min(1, Math.max(0, amount))));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/** Temperatura de color aproximada (Kelvin) a RGB, para luces calidas o frias. */
export function kelvinToHex(kelvin: number): string {
  const temperature = Math.min(6500, Math.max(2700, kelvin)) / 100;
  const red = 255;
  const green = 99.47 * Math.log(temperature) - 161.12;
  const blue = temperature >= 66 ? 255 : 138.52 * Math.log(temperature - 10) - 305.04;
  const clamp = (channel: number) => Math.round(Math.min(255, Math.max(0, channel)));
  return `#${[red, green, blue].map((channel) => clamp(channel).toString(16).padStart(2, '0')).join('')}`;
}

/** Oscurece un color mezclandolo con negro (`amount` entre 0 y 1). */
export function shade(hex: string, amount: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) {
    return hex;
  }
  const value = Number.parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const factor = 1 - Math.min(1, Math.max(0, amount));
  return `#${channels.map((channel) => Math.round(channel * factor).toString(16).padStart(2, '0')).join('')}`;
}
