'use client';

import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import type { Lot } from '@/lib/api/types';
import { sheetHref } from '@/lib/artwork/sheet-href';

/** Ficha de la obra que se esta mirando de cerca, sobre la sala de `ownerId`. */
export function ArtworkCard({ lot, ownerId, onBack }: { lot: Lot; ownerId: string; onBack: () => void }) {
  const dimensions = [lot.widthCm, lot.heightCm, lot.depthCm].filter((value): value is string => Boolean(value));
  return (
    <aside
      aria-label={`Ficha de ${lot.title}`}
      className="w-full max-w-sm rounded-panel border border-line bg-surface/95 p-5 shadow-lift backdrop-blur"
    >
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-oxide">En la sala</p>
      <h2 className="mt-1 font-serif text-2xl italic leading-tight">{lot.title}</h2>
      <p className="mt-1 text-sm">
        {lot.artistName ?? 'Artista sin atribuir'}
        {lot.creationYear ? `, ${String(lot.creationYear)}` : ''}
      </p>
      <dl className="mt-3 space-y-1 text-sm text-muted">
        <div>
          <dt className="sr-only">Materiales</dt>
          <dd>{lot.materials}</dd>
        </div>
        {dimensions.length > 0 ? (
          <div>
            <dt className="sr-only">Medidas</dt>
            <dd>{dimensions.map((value) => Number(value).toLocaleString('es-CO')).join(' × ')} cm</dd>
          </div>
        ) : null}
      </dl>
      {lot.description ? <p className="mt-3 line-clamp-4 text-sm">{lot.description}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />} onClick={onBack}>
          Seguir el recorrido
        </Button>
        <ButtonLink href={sheetHref(lot, ownerId)} variant="ghost" size="sm" icon={<ExternalLink aria-hidden="true" className="h-4 w-4" />}>
          Ver ficha completa
        </ButtonLink>
      </div>
    </aside>
  );
}
