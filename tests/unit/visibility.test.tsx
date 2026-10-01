import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScoreRing } from '@/components/score-ring';
import { canShowLot } from '@/lib/visibility';

describe('visibilidad y score', () => {
  it('no muestra un lote privado a otra persona', () => {
    expect(canShowLot({ visibility: 'PRIVATE', sellerId: 'seller' }, 'otro')).toBe(false);
    expect(canShowLot({ visibility: 'PRIVATE', sellerId: 'seller' }, 'seller')).toBe(true);
  });

  it('anuncia el puntaje de autenticidad', () => {
    render(<ScoreRing score={82} verdict="APROBADO" />);
    expect(screen.getByRole('img', { name: /82/ })).toBeInTheDocument();
    expect(screen.getByText('APROBADO')).toBeInTheDocument();
  });
});
