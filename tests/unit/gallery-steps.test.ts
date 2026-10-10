import { describe, expect, it } from 'vitest';
import { emptyAnswers, stepComplete } from '@/lib/gallery/steps';

describe('cuestionario de la galería', () => {
  it('no deja avanzar el primer paso sin estilos ni ambiente', () => {
    expect(stepComplete(0, emptyAnswers())).toBe(false);
  });

  it('conserva el paso completo cuando ya hay respuestas', () => {
    const answers = emptyAnswers();
    answers['artStyles'] = ['barroco'];
    answers['favoriteStyle'] = 'barroco';
    answers['atmosphere'] = 'dramatico';
    expect(stepComplete(0, answers)).toBe(true);
    expect(stepComplete(1, answers)).toBe(false);
  });
});
