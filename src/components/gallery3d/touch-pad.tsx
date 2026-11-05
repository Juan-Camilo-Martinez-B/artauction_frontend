'use client';

import { ArrowDown, ArrowUp, RotateCcw, RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ButtonHTMLAttributes, RefObject, PointerEvent, ReactNode } from 'react';
import type { MoveIntent } from './tour-controls';

/**
 * Controles en pantalla para caminar sin teclado (tactil o raton): mientras se
 * mantiene pulsado un boton, la intencion de movimiento queda activa.
 */
export function TouchPad({ intent }: { intent: RefObject<MoveIntent> }) {
  const t = useTranslations('Studio.pad');
  const hold = (patch: Partial<MoveIntent>) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      Object.assign(intent.current, patch);
    },
    onPointerUp: () => { Object.assign(intent.current, { forward: 0, turn: 0 }); },
    onPointerCancel: () => { Object.assign(intent.current, { forward: 0, turn: 0 }); },
  });
  return (
    <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t('label')}>
      <span />
      <PadButton label={t('forward')} {...hold({ forward: 1 })}>
        <ArrowUp aria-hidden="true" className="h-4 w-4" />
      </PadButton>
      <span />
      <PadButton label={t('turnLeft')} {...hold({ turn: 1 })}>
        <RotateCcw aria-hidden="true" className="h-4 w-4" />
      </PadButton>
      <PadButton label={t('backward')} {...hold({ forward: -1 })}>
        <ArrowDown aria-hidden="true" className="h-4 w-4" />
      </PadButton>
      <PadButton label={t('turnRight')} {...hold({ turn: -1 })}>
        <RotateCw aria-hidden="true" className="h-4 w-4" />
      </PadButton>
    </div>
  );
}

function PadButton({ label, children, ...handlers }: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-10 w-10 touch-none select-none items-center justify-center rounded-full bg-surface/90 text-ink shadow-panel hover:bg-surface active:bg-paper-deep"
      {...handlers}
    >
      {children}
    </button>
  );
}
