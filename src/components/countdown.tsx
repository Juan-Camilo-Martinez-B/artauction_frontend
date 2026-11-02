'use client';

import { useRemaining } from '@/hooks/use-remaining';

export function Countdown({ endsAt, offsetMs }: { endsAt: string; offsetMs: number }) {
  const { label } = useRemaining(endsAt, offsetMs);
  return (
    <p className="font-serif text-5xl tabular-nums" role="timer" aria-live="polite" aria-atomic="true">
      {label}
    </p>
  );
}
