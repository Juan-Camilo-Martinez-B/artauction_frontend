'use client';

import { useEffect, useState } from 'react';
import { formatRemaining, remainingMs } from '@/lib/clock';

export function Countdown({ endsAt, offsetMs }: { endsAt: string; offsetMs: number }) {
  const [label, setLabel] = useState(() => formatRemaining(remainingMs(endsAt, offsetMs)));

  useEffect(() => {
    let frame = 0;
    let lastSecond = -1;
    const paint = () => {
      const ms = remainingMs(endsAt, offsetMs);
      const second = Math.floor(ms / 1000);
      if (second !== lastSecond) {
        lastSecond = second;
        setLabel(formatRemaining(ms));
      }
      frame = window.requestAnimationFrame(paint);
    };
    frame = window.requestAnimationFrame(paint);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [endsAt, offsetMs]);

  return (
    <p className="font-serif text-5xl tabular-nums" role="timer" aria-live="polite" aria-atomic="true">
      {label}
    </p>
  );
}
