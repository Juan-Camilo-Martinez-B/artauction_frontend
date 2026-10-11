import { describe, expect, it } from 'vitest';
import {
  amountTakenMessage,
  canWithdraw,
  durationMinutes,
  holdIncrease,
  openingCoins,
  scheduleWindow,
  WITHDRAW_LEAD_MS,
} from '@/lib/auction/policy';

describe('contrato de subasta en el cliente', () => {
  const now = new Date('2026-10-11T12:00:00.000Z');

  it('coincide con la duración, la retención y el aviso de monto repetido', () => {
    expect(durationMinutes(70)).toBe(105);
    expect(openingCoins(200, 400)).toBe(300);
    expect(holdIncrease(250, 320)).toBe(70);
    expect(canWithdraw(now, new Date(now.getTime() + WITHDRAW_LEAD_MS))).toBe(true);
    expect(amountTakenMessage(200_000)).toBe('La oferta de 2000 ya fue publicada por otro usuario.');
    const window = scheduleWindow(now, 45, () => 0);
    expect(window.startsAt.getTime()).toBeGreaterThan(now.getTime());
    expect(window.endsAt.getTime() - window.startsAt.getTime()).toBe(45 * 60_000);
  });
});
