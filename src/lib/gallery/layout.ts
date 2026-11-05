import type { GalleryConfig, Lot } from '@/lib/api/types';

// Montaje de la sala: tamano de exhibicion de cada obra, geometria de las paredes y el
// plan de colgado automatico. Todo en metros, con el origen en el centro del
// suelo: x hacia la derecha, z hacia el frente (donde entra el visitante).

export interface Room {
  width: number;
  depth: number;
  height: number;
}

export interface Placement {
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
  scale: number;
  support: string;
}

export interface ArtworkSize {
  width: number;
  height: number;
  depth: number;
}

export type WallSide = 'back' | 'left' | 'right' | 'front';

/** Orden de recorrido: primero el fondo, luego los costados y al final la pared de entrada. */
export const WALL_ORDER: readonly WallSide[] = ['back', 'left', 'right', 'front'];

/** Altura del centro de una obra mural: estandar de museo, a la altura de los ojos. */
export const EYE_LEVEL = 1.55;
/** Distancia libre entre una obra y la esquina. */
const CORNER_MARGIN = 0.9;
/** Separacion entre obras de una misma pared. */
const WALL_GAP = 0.8;
/** Las obras murales sobresalen un poco de la pared (marco). */
const WALL_OFFSET = 0.04;
/** Distancia minima de un pedestal a las paredes, para mirar los cuadros sin chocar. */
const OBJECT_WALL_CLEARANCE = 2.6;
const OBJECT_SPACING = 2.4;

const DEFAULT_2D: ArtworkSize = { width: 0.6, height: 0.8, depth: 0.04 };
const DEFAULT_3D: ArtworkSize = { width: 0.35, height: 0.45, depth: 0.35 };

function centimeters(value: string | null | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed / 100 : null;
}

export function isObjectLot(lot: Pick<Lot, 'representationKind'>): boolean {
  return lot.representationKind === 'THREE_D';
}

/** Un objeto solo se expone en la sala con su modelo 3D real; una obra plana, siempre. */
export function canExhibit(lot: Pick<Lot, 'representationKind' | 'model'>): boolean {
  return !isObjectLot(lot) || Boolean(lot.model?.url);
}

/** Lo mas grande que entra en cualquier sala: ancho, alto y fondo en metros. */
const MAX_SIZE: ArtworkSize = { width: 4, height: 2.6, depth: 3 };

/**
 * Lado mayor minimo de una obra mural en la sala. A tamano real, una acuarela de
 * 18 cm o un cromo de 7 cm apenas se distinguen desde el centro de la sala.
 */
const MIN_WALL_SIDE = 0.8;

/**
 * Tamano de exhibicion en metros: el real, salvo que una obra mural pequena se
 * amplia entera hasta MIN_WALL_SIDE. Si no cabe en la sala se reduce entera, con
 * el mismo factor en las tres medidas: limitar cada una por separado deformaba
 * la pieza (una estatua alta quedaba ancha y achatada).
 */
export function artworkSize(lot: Pick<Lot, 'widthCm' | 'heightCm' | 'depthCm' | 'representationKind'>): ArtworkSize {
  const object = isObjectLot(lot);
  const fallback = object ? DEFAULT_3D : DEFAULT_2D;
  const width = centimeters(lot.widthCm) ?? fallback.width;
  const height = centimeters(lot.heightCm) ?? fallback.height;
  const depth = object ? (centimeters(lot.depthCm) ?? width) : DEFAULT_2D.depth;
  const grow = object ? 1 : Math.max(1, MIN_WALL_SIDE / Math.max(width, height));
  const fit = Math.min(grow, MAX_SIZE.width / width, MAX_SIZE.height / height, object ? MAX_SIZE.depth / depth : grow);
  return { width: width * fit, height: height * fit, depth: object ? depth * fit : depth };
}

/**
 * Ajusta una obra mural a la proporcion real de su imagen, para no deformarla
 * cuando las medidas declaradas no coinciden. Conserva el lado mayor y no se
 * sale de lo que cabe en la sala.
 */
export function fitSizeToImage(size: ArtworkSize, imageWidth: number, imageHeight: number): ArtworkSize {
  if (!(imageWidth > 0) || !(imageHeight > 0)) {
    return size;
  }
  const ratio = imageWidth / imageHeight;
  const longest = Math.max(size.width, size.height);
  const width = ratio >= 1 ? longest : longest * ratio;
  const height = ratio >= 1 ? longest / ratio : longest;
  const fit = Math.min(1, MAX_SIZE.width / width, MAX_SIZE.height / height);
  return { width: width * fit, height: height * fit, depth: size.depth };
}

export function wallLength(side: WallSide, room: Room): number {
  return side === 'back' || side === 'front' ? room.width : room.depth;
}

/**
 * Punto de una pared. `t` es la distancia al centro de la pared hacia la
 * derecha de quien la mira; la obra queda girada mirando hacia la sala.
 */
export function wallPoint(side: WallSide, t: number, room: Room): { x: number; z: number; rotY: number } {
  const halfW = room.width / 2;
  const halfD = room.depth / 2;
  switch (side) {
    case 'back':
      return { x: t, z: -halfD + WALL_OFFSET, rotY: 0 };
    case 'left':
      return { x: -halfW + WALL_OFFSET, z: -t, rotY: Math.PI / 2 };
    case 'right':
      return { x: halfW - WALL_OFFSET, z: t, rotY: -Math.PI / 2 };
    case 'front':
      return { x: -t, z: halfD - WALL_OFFSET, rotY: Math.PI };
  }
}

/** Pared en la que esta colgada una obra, deducida de su giro. */
export function wallSideOf(placement: Pick<Placement, 'rotY'>): WallSide {
  const turns = Math.round(placement.rotY / (Math.PI / 2));
  const normalized = ((turns % 4) + 4) % 4;
  return (['back', 'left', 'front', 'right'] as const)[normalized] ?? 'back';
}

/** Coordenada `t` de una obra sobre su pared (inversa de wallPoint). */
export function wallCoordinate(placement: Pick<Placement, 'posX' | 'posZ' | 'rotY'>): number {
  switch (wallSideOf(placement)) {
    case 'back':
      return placement.posX;
    case 'left':
      return -placement.posZ;
    case 'right':
      return placement.posZ;
    case 'front':
      return -placement.posX;
  }
}

/** Altura del centro de una obra mural: ojos a 1,55 m, sin tocar suelo ni techo. */
export function hangingHeight(size: ArtworkSize, room: Room): number {
  const lowest = size.height / 2 + 0.5;
  const highest = room.height - size.height / 2 - 0.25;
  return Math.max(lowest, Math.min(EYE_LEVEL, highest));
}

/** Cuelga una obra en una pared, acotando su posicion para que no se salga. */
export function placeOnWall(side: WallSide, t: number, y: number, size: ArtworkSize, room: Room, scale = 1): Placement {
  const halfSpan = Math.max(0, wallLength(side, room) / 2 - CORNER_MARGIN / 2 - (size.width * scale) / 2);
  const clampedT = Math.min(halfSpan, Math.max(-halfSpan, t));
  const minY = (size.height * scale) / 2 + 0.3;
  const maxY = room.height - (size.height * scale) / 2 - 0.15;
  const point = wallPoint(side, clampedT, room);
  return {
    posX: point.x,
    posY: Math.min(maxY, Math.max(minY, y)),
    posZ: point.z,
    rotY: point.rotY,
    scale,
    support: 'WALL',
  };
}

/** Coloca un objeto en el suelo dentro de la sala, lejos de las paredes. */
export function placeOnFloor(x: number, z: number, rotY: number, room: Room, scale = 1, support = 'PEDESTAL'): Placement {
  const limitX = Math.max(0, room.width / 2 - 1.2);
  const limitZ = Math.max(0, room.depth / 2 - 1.2);
  return {
    posX: Math.min(limitX, Math.max(-limitX, x)),
    posY: 0,
    posZ: Math.min(limitZ, Math.max(-limitZ, z)),
    rotY,
    scale,
    support,
  };
}

export interface HangingItem {
  id: string;
  size: ArtworkSize;
  isObject: boolean;
}

/**
 * Plan de colgado automatico. Las obras murales recorren las paredes en orden
 * (fondo, izquierda, derecha, entrada) con separacion fija, centradas en cada
 * pared. Si no caben, las que sobran forman una segunda fila sobre la primera.
 * Los objetos van en pedestales en una reticula en el centro de la sala.
 */
export function hangingPlan(items: readonly HangingItem[], room: Room): Map<string, Placement> {
  const plan = new Map<string, Placement>();
  const wallItems = items.filter((item) => !item.isObject);
  const objects = items.filter((item) => item.isObject);

  let pending = [...wallItems];
  for (let tier = 0; tier < 2 && pending.length > 0; tier += 1) {
    for (const side of WALL_ORDER) {
      const usable = wallLength(side, room) - 2 * CORNER_MARGIN;
      const row: HangingItem[] = [];
      let used = 0;
      while (pending.length > 0) {
        const next = pending[0] as HangingItem;
        const needed = used + (row.length > 0 ? WALL_GAP : 0) + next.size.width;
        if (needed > usable && row.length > 0) {
          break;
        }
        row.push(next);
        used = needed;
        pending = pending.slice(1);
      }
      let cursor = -used / 2;
      for (const item of row) {
        const base = hangingHeight(item.size, room);
        // La segunda fila va encima de la primera, al estilo de un salon de pintura.
        const y = tier === 0 ? base : base + item.size.height + 0.35;
        plan.set(item.id, placeOnWall(side, cursor + item.size.width / 2, y, item.size, room));
        cursor += item.size.width + WALL_GAP;
      }
    }
  }
  // Si aun sobran (salas muy pequenas y muchas obras), van a la pared del fondo sin acotar el orden.
  pending.forEach((item, index) => {
    plan.set(item.id, placeOnWall('back', index * 0.3, hangingHeight(item.size, room), item.size, room));
  });

  objectGrid(objects.length, room).forEach((point, index) => {
    const item = objects[index] as HangingItem;
    plan.set(item.id, placeOnFloor(point.x, point.z, 0, room));
  });
  return plan;
}

/** Reticula centrada para los pedestales, del centro hacia afuera. */
export function objectGrid(count: number, room: Room): Array<{ x: number; z: number }> {
  if (count === 0) {
    return [];
  }
  const innerW = Math.max(0, room.width - 2 * OBJECT_WALL_CLEARANCE);
  const innerD = Math.max(0, room.depth - 2 * OBJECT_WALL_CLEARANCE);
  let spacing = OBJECT_SPACING;
  let columns = Math.max(1, Math.floor(innerW / spacing) + 1);
  let rows = Math.max(1, Math.floor(innerD / spacing) + 1);
  if (columns * rows < count) {
    spacing = 1.6;
    columns = Math.max(1, Math.floor(innerW / spacing) + 1);
    rows = Math.max(1, Math.ceil(count / columns));
  }
  const points: Array<{ x: number; z: number }> = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      points.push({ x: (column - (columns - 1) / 2) * spacing, z: (row - (rows - 1) / 2) * spacing });
    }
  }
  // Primero los puntos mas cercanos al centro: con pocas piezas, quedan al medio.
  return points.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z) || a.z - b.z || a.x - b.x).slice(0, count);
}

/** Dos obras murales de la misma pared se superponen. Sirve para sugerir "Organizar". */
export function hasOverlaps(entries: ReadonlyArray<{ placement: Placement; size: ArtworkSize }>): boolean {
  const walls = entries.filter((entry) => entry.placement.support === 'WALL');
  for (let i = 0; i < walls.length; i += 1) {
    for (let j = i + 1; j < walls.length; j += 1) {
      const a = walls[i] as (typeof walls)[number];
      const b = walls[j] as (typeof walls)[number];
      if (wallSideOf(a.placement) !== wallSideOf(b.placement)) {
        continue;
      }
      const dx = Math.abs(wallCoordinate(a.placement) - wallCoordinate(b.placement));
      const dy = Math.abs(a.placement.posY - b.placement.posY);
      if (dx < (a.size.width * a.placement.scale + b.size.width * b.placement.scale) / 2 && dy < (a.size.height * a.placement.scale + b.size.height * b.placement.scale) / 2) {
        return true;
      }
    }
  }
  return false;
}

/** Altura de los ojos de quien recorre la sala. */
export const VISITOR_EYE = 1.6;

/**
 * Desde donde mirar una obra al elegirla: de frente, a una distancia que la
 * deja entera en el campo de vision. `objectTop` es la altura del objeto sobre
 * el suelo (con pedestal) para piezas 3D.
 */
export function viewpointFor(
  placement: Placement,
  size: ArtworkSize,
  room: Room,
  objectTop?: number,
): { position: [number, number, number]; target: [number, number, number] } {
  const normal = { x: Math.sin(placement.rotY), z: Math.cos(placement.rotY) };
  const extent = Math.max(size.width, size.height) * placement.scale;
  // Las piezas pequenas se miran de cerca, como en un museo; las grandes, desde mas atras.
  const distance = Math.max(0.85, extent * 1.25 + 0.6);
  const limitX = room.width / 2 - 0.4;
  const limitZ = room.depth / 2 - 0.4;
  const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));
  const targetY = objectTop !== undefined ? objectTop - (size.height * placement.scale) / 2 : placement.posY;
  return {
    position: [clamp(placement.posX + normal.x * distance, limitX), VISITOR_EYE, clamp(placement.posZ + normal.z * distance, limitZ)],
    target: [placement.posX, targetY, placement.posZ],
  };
}

export function roomOf(config: GalleryConfig): Room {
  return { width: config.architecture.roomWidth, depth: config.architecture.roomDepth, height: config.architecture.roomHeight };
}

/** Altura del pedestal segun la pieza: lo chico se eleva a la vista, lo grande va casi al suelo. */
export function pedestalHeight(objectHeight: number): number {
  if (objectHeight >= 1.5) {
    return 0.1;
  }
  if (objectHeight >= 0.8) {
    return 0.45;
  }
  return 0.95;
}

/** Radio que ocupa un pedestal en el suelo, para que el visitante no lo atraviese. */
export function footprintRadius(size: ArtworkSize, scale: number): number {
  return (Math.max(0.45, Math.max(size.width, size.depth) + 0.3) * scale) / Math.SQRT2 + 0.05;
}

/** Altura total de un objeto sobre el suelo, con su pedestal. */
export function objectTop(size: ArtworkSize, scale: number): number {
  return (pedestalHeight(size.height) + size.height) * scale;
}
