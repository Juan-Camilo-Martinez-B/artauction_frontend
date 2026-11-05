import { describe, expect, it } from 'vitest';
import {
  artworkSize,
  fitSizeToImage,
  EYE_LEVEL,
  hangingPlan,
  hasOverlaps,
  objectGrid,
  placeOnWall,
  viewpointFor,
  wallCoordinate,
  wallPoint,
  wallSideOf,
  WALL_ORDER,
  type Room,
} from '@/lib/gallery/layout';

const ROOM: Room = { width: 12, depth: 10, height: 4 };

/** Valor presente o falla la prueba (el lint no admite el operador !). */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Se esperaba un valor');
  }
  return value;
}

describe('geometría de las paredes', () => {
  it('ida y vuelta entre la coordenada de la pared y el espacio', () => {
    for (const side of WALL_ORDER) {
      const point = wallPoint(side, 1.5, ROOM);
      const placement = { posX: point.x, posZ: point.z, rotY: point.rotY };
      expect(wallSideOf(placement)).toBe(side);
      expect(wallCoordinate(placement)).toBeCloseTo(1.5);
    }
  });

  it('cada obra mira hacia el centro de la sala', () => {
    for (const side of WALL_ORDER) {
      const point = wallPoint(side, 0, ROOM);
      const normal = { x: Math.sin(point.rotY), z: Math.cos(point.rotY) };
      // Avanzar por la normal acerca al centro.
      expect(Math.hypot(point.x + normal.x, point.z + normal.z)).toBeLessThan(Math.hypot(point.x, point.z));
    }
  });

  it('no deja que una obra se salga de su pared ni toque el suelo', () => {
    const size = { width: 2, height: 1, depth: 0.04 };
    const placed = placeOnWall('back', 99, 0, size, ROOM);
    expect(placed.posX).toBeCloseTo(6 - 0.45 - 1);
    expect(placed.posY).toBeCloseTo(0.5 + 0.3);
  });
});

describe('tamaño real de las obras', () => {
  it('usa los centímetros declarados', () => {
    expect(artworkSize({ widthCm: '120', heightCm: '90', depthCm: null, representationKind: 'TWO_D' })).toEqual({ width: 1.2, height: 0.9, depth: 0.04 });
  });

  it('una obra mural pequena se amplia entera hasta verse desde la sala', () => {
    const card = artworkSize({ widthCm: '3.5', heightCm: '7', depthCm: null, representationKind: 'TWO_D' });
    expect(card.height).toBeCloseTo(0.8);
    expect(card.width).toBeCloseTo(0.4);
  });

  it('un objeto pequeno conserva su tamano: solo se amplian las obras murales', () => {
    expect(artworkSize({ widthCm: '10', heightCm: '20', depthCm: '10', representationKind: 'THREE_D' })).toEqual({ width: 0.1, height: 0.2, depth: 0.1 });
  });

  it('el marco sigue la proporcion real de la imagen y conserva el lado mayor', () => {
    const declared = { width: 0.8, height: 0.8, depth: 0.04 };
    expect(fitSizeToImage(declared, 400, 800)).toEqual({ width: 0.4, height: 0.8, depth: 0.04 });
    expect(fitSizeToImage(declared, 800, 400)).toEqual({ width: 0.8, height: 0.4, depth: 0.04 });
    expect(fitSizeToImage(declared, 0, 400)).toBe(declared);
    // Una imagen muy alta no se sale del alto que cabe en la sala.
    expect(fitSizeToImage({ width: 3.6, height: 2, depth: 0.04 }, 500, 1000).height).toBeCloseTo(2.6);
  });

  it('una pieza que no cabe se reduce entera, sin deformarse', () => {
    // Estatua de 3,6 m: se reduce a 2,6 m de alto y el ancho y el fondo en la misma proporcion.
    const size = artworkSize({ widthCm: '90', heightCm: '360', depthCm: '72', representationKind: 'THREE_D' });
    expect(size.height).toBeCloseTo(2.6);
    expect(size.width / size.height).toBeCloseTo(90 / 360);
    expect(size.depth / size.height).toBeCloseTo(72 / 360);
  });

  it('usa medidas por defecto si faltan', () => {
    expect(artworkSize({ widthCm: null, heightCm: null, depthCm: null, representationKind: 'THREE_D' })).toEqual({ width: 0.35, height: 0.45, depth: 0.35 });
  });
});

describe('plan de colgado', () => {
  const painting = (id: string, width = 1) => ({ id, size: { width, height: 0.8, depth: 0.04 }, isObject: false });

  it('reparte las obras por las paredes sin superponerlas', () => {
    const items = Array.from({ length: 14 }, (_, index) => painting(`p${String(index)}`, 1.2));
    const plan = hangingPlan(items, ROOM);
    expect(plan.size).toBe(14);
    const entries = items.map((item) => ({ placement: must(plan.get(item.id)), size: item.size }));
    expect(hasOverlaps(entries)).toBe(false);
    expect(new Set(entries.map((entry) => wallSideOf(entry.placement))).size).toBeGreaterThan(1);
    expect(entries.every((entry) => entry.placement.posY === EYE_LEVEL)).toBe(true);
  });

  it('centra una sola obra en la pared del fondo', () => {
    const placement = must(hangingPlan([painting('solo')], ROOM).get('solo'));
    expect(wallSideOf(placement)).toBe('back');
    expect(placement.posX).toBeCloseTo(0);
  });

  it('pone los objetos en pedestales, el primero en el centro', () => {
    const plan = hangingPlan([{ id: 'v', size: { width: 0.3, height: 0.4, depth: 0.3 }, isObject: true }], ROOM);
    expect(plan.get('v')).toMatchObject({ posX: 0, posZ: 0, support: 'PEDESTAL' });
    const grid = objectGrid(5, ROOM);
    expect(grid).toHaveLength(5);
    expect(new Set(grid.map((point) => `${String(point.x)},${String(point.z)}`)).size).toBe(5);
  });

  it('detecta obras encimadas para sugerir "Organizar"', () => {
    const size = { width: 1, height: 1, depth: 0.04 };
    const a = placeOnWall('back', 0, 1.55, size, ROOM);
    const b = placeOnWall('back', 0.5, 1.55, size, ROOM);
    const c = placeOnWall('left', 0.5, 1.55, size, ROOM);
    expect(hasOverlaps([{ placement: a, size }, { placement: b, size }])).toBe(true);
    expect(hasOverlaps([{ placement: a, size }, { placement: c, size }])).toBe(false);
  });
});

describe('punto de vista', () => {
  it('se para frente a la obra, a la altura de los ojos y más cerca de las pequeñas', () => {
    const big = placeOnWall('back', 0, 1.55, { width: 2, height: 1.5, depth: 0.04 }, ROOM);
    const small = placeOnWall('back', 0, 1.55, { width: 0.05, height: 0.07, depth: 0.04 }, ROOM);
    const far = viewpointFor(big, { width: 2, height: 1.5, depth: 0.04 }, ROOM);
    const near = viewpointFor(small, { width: 0.05, height: 0.07, depth: 0.04 }, ROOM);
    expect(far.position[1]).toBe(1.6);
    expect(far.target).toEqual([big.posX, big.posY, big.posZ]);
    expect(far.position[2] - big.posZ).toBeGreaterThan(near.position[2] - small.posZ);
  });
});
