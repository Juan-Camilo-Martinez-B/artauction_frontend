// Teclado del recorrido, sin React ni 3D: WASD camina y las flechas mueven la camara.

const KEYS = {
  forward: ['KeyW'],
  back: ['KeyS'],
  left: ['KeyA'],
  right: ['KeyD'],
  lookLeft: ['ArrowLeft', 'KeyQ'],
  lookRight: ['ArrowRight', 'KeyE'],
  lookUp: ['ArrowUp'],
  lookDown: ['ArrowDown'],
} as const;

const TOUR_KEYS: ReadonlySet<string> = new Set(Object.values(KEYS).flat());

export function isTourKey(code: string): boolean {
  return TOUR_KEYS.has(code);
}

export interface TourInput {
  /** Caminar: 1 adelante, -1 atras. */
  forward: number;
  /** Paso lateral: 1 a la derecha, -1 a la izquierda. */
  strafe: number;
  /** Girar la camara: 1 a la izquierda, -1 a la derecha. */
  turn: number;
  /** Inclinar la camara: 1 arriba, -1 abajo. */
  tilt: number;
}

export function tourInput(pressed: ReadonlySet<string>): TourInput {
  const axis = (positive: readonly string[], negative: readonly string[]) =>
    (positive.some((code) => pressed.has(code)) ? 1 : 0) - (negative.some((code) => pressed.has(code)) ? 1 : 0);
  return {
    forward: axis(KEYS.forward, KEYS.back),
    strafe: axis(KEYS.right, KEYS.left),
    turn: axis(KEYS.lookLeft, KEYS.lookRight),
    tilt: axis(KEYS.lookUp, KEYS.lookDown),
  };
}
