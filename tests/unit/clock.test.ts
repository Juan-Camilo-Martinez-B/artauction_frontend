import { describe, expect, it } from 'vitest';
import { clockOffset, formatRemaining, remainingMs } from '@/lib/clock';

describe('reloj de la sala', () => {
  it('calcula el desfase con el servidor y el tiempo que queda', () => {
    const clientNow = Date.parse('2026-10-01T12:00:00.000Z');
    const offset = clockOffset('2026-10-01T12:00:02.000Z', clientNow);
    expect(offset).toBe(2000);
    expect(remainingMs('2026-10-01T12:00:32.000Z', offset, clientNow)).toBe(30_000);
    expect(formatRemaining(30_000)).toBe('00:30');
    expect(formatRemaining(0)).toBe('00:00');
    expect(formatRemaining(3_700_000)).toBe('01:01:40');
  });
});
