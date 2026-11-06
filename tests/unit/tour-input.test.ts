import { describe, expect, it } from 'vitest';
import { isTourKey, tourInput } from '@/lib/gallery/tour-input';

const pressed = (...codes: string[]) => tourInput(new Set(codes));

describe('teclado del recorrido', () => {
  it('WASD camina y no mueve la camara', () => {
    expect(pressed('KeyW')).toEqual({ forward: 1, strafe: 0, turn: 0, tilt: 0 });
    expect(pressed('KeyS')).toEqual({ forward: -1, strafe: 0, turn: 0, tilt: 0 });
    expect(pressed('KeyD')).toEqual({ forward: 0, strafe: 1, turn: 0, tilt: 0 });
    expect(pressed('KeyA')).toEqual({ forward: 0, strafe: -1, turn: 0, tilt: 0 });
  });

  it('las flechas mueven la camara y no caminan', () => {
    expect(pressed('ArrowUp')).toEqual({ forward: 0, strafe: 0, turn: 0, tilt: 1 });
    expect(pressed('ArrowDown')).toEqual({ forward: 0, strafe: 0, turn: 0, tilt: -1 });
    expect(pressed('ArrowLeft')).toEqual({ forward: 0, strafe: 0, turn: 1, tilt: 0 });
    expect(pressed('ArrowRight')).toEqual({ forward: 0, strafe: 0, turn: -1, tilt: 0 });
  });

  it('caminar y mirar a la vez se suman; teclas opuestas se anulan', () => {
    expect(pressed('KeyW', 'ArrowUp')).toEqual({ forward: 1, strafe: 0, turn: 0, tilt: 1 });
    expect(pressed('ArrowUp', 'ArrowDown').tilt).toBe(0);
  });

  it('solo reclama las teclas del recorrido', () => {
    expect(isTourKey('ArrowUp')).toBe(true);
    expect(isTourKey('KeyQ')).toBe(true);
    expect(isTourKey('Tab')).toBe(false);
  });
});
