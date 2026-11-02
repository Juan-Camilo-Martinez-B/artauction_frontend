'use client';

import { useEffect, useState } from 'react';
import { formatRemaining, remainingMs } from '@/lib/clock';

/**
 * Tiempo que falta hasta `targetIso` con el reloj del servidor. Se recalcula en
 * cada frame, pero solo provoca un render cuando cambia el segundo.
 */
export function useRemaining(targetIso: string, offsetMs: number): { ms: number; label: string } {
  const [state, setState] = useState(() => {
    const ms = remainingMs(targetIso, offsetMs);
    return { ms, label: formatRemaining(ms) };
  });

  useEffect(() => {
    let frame = 0;
    let lastSecond = Number.NaN;
    const paint = () => {
      const ms = remainingMs(targetIso, offsetMs);
      const second = Math.floor(ms / 1000);
      if (second !== lastSecond) {
        lastSecond = second;
        setState({ ms, label: formatRemaining(ms) });
      }
      frame = window.requestAnimationFrame(paint);
    };
    frame = window.requestAnimationFrame(paint);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [targetIso, offsetMs]);

  return state;
}
