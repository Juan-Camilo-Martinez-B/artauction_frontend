'use client';

import { Gavel } from 'lucide-react';
import { useState } from 'react';
import { ScoreRing } from '@/components/score-ring';
import { StatusPill } from '@/components/status-pill';
import { ImageFormat, type ImageOrientation } from '@/lib/artwork/image-format';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { auditSourceLabel, isPersonal, isReturned } from '@/lib/artwork/lot-review';
import { formatArtacoins } from '@/lib/auction/policy';
import { formatDateTime } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import type { Lot } from '@/lib/api/types';

export function ArtworkExhibit({ lot }: { lot: Lot }) {
  const image = lot.images?.find((item) => item.url)?.url ?? null;
  const [format, setFormat] = useState<ImageFormat | null>(null);
  const orientation = format?.orientation() ?? 'pending';
  const category = lot.categories?.find((link) => link.isPrimary)?.category.name ?? 'Sin categoría';
  const representation =
    lot.representationKind === 'THREE_D'
      ? 'Objeto tridimensional'
      : lot.representationKind === 'TWO_D'
        ? 'Obra bidimensional'
        : 'Formato sin clasificar';
  const summary = lot.auditSummaries?.[0];
  const source = auditSourceLabel(summary, lot);
  // Un proyecto propio no se audita ni se vende: no tiene score, precio ni sala.
  const personal = isPersonal(lot);

  return (
    <article className={sheetClass(orientation)}>
      <ArtworkFrame
        src={image}
        alt={lot.title}
        orientation={orientation}
        caption={format?.label() ?? 'Obra'}
        onMeasure={(width, height) => { setFormat(new ImageFormat(width, height)); }}
      />
      <div className={dossierClass(orientation)}>
        <section className="rounded-panel border border-line bg-surface p-6 shadow-panel sm:p-8">
          {isReturned(lot) ? (
            // Una obra en borrador solo la ve quien la publico (o un administrador).
            <Notice tone="info" className="mb-5">
              <div>
                <span className="block font-medium">Un administrador devolvió esta obra</span>
                {lot.lastReview?.reason ? <span className="block">{lot.lastReview.reason}</span> : null}
                <ButtonLink href={`/publicar/${lot.id}`} size="sm" className="mt-3">
                  Editar y reenviar
                </ButtonLink>
              </div>
            </Notice>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={isReturned(lot) ? 'DEVUELTA' : lot.status} />
            {personal ? <span className="text-xs uppercase tracking-[0.18em] text-muted">Sin auditar</span> : null}
            <span className="text-xs uppercase tracking-[0.18em] text-oxide">{category}</span>
          </div>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">{lot.title}</h1>
          <p className="mt-3 text-lg text-muted">
            {lot.artistName ?? 'Sin atribuir'}
            <span className="text-ink"> · {lot.creationYear ?? 'año desconocido'}</span>
          </p>
          <p className="mt-6 max-w-prose text-base leading-relaxed sm:text-lg">{lot.description}</p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <Fact label="Materiales" value={lot.materials} />
            <Fact label="Presentación" value={representation} />
            <Fact label="Medidas" value={measures(lot)} />
            <Fact label="Procedencia" value={lot.provenance?.trim() || 'Sin procedencia en la ficha'} />
            {personal ? null : (
              <Fact
                label="Banda sugerida"
                value={`${formatMoney(lot.suggestedPriceMin)} – ${formatMoney(lot.suggestedPriceMax)}`}
              />
            )}
          </dl>
          {lot.auction?.saleDescription ? (
            <p className="mt-6 max-w-prose leading-relaxed">{lot.auction.saleDescription}</p>
          ) : null}
          {lot.auction && lot.auction.status !== 'CERRADA' ? (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-field border border-line bg-paper p-4">
              <p className="text-sm">
                <span className="block font-medium">
                  {lot.auction.status === 'ACTIVA' ? 'Sala abierta ahora' : 'Subasta programada'}
                </span>
                <span className="text-muted">
                  {lot.auction.status === 'ACTIVA'
                    ? `Va en ${formatArtacoins(lot.auction.currentPrice)}`
                    : `Sale en ${formatArtacoins(lot.auction.currentPrice)}${lot.auction.startsAt ? ` · abre el ${formatDateTime(lot.auction.startsAt)}` : ''}`}
                </span>
              </p>
              <ButtonLink href={`/subasta/${lot.auction.id}`} variant={lot.auction.status === 'ACTIVA' ? 'accent' : 'secondary'} icon={<Gavel aria-hidden="true" className="h-4 w-4" />}>
                {lot.auction.status === 'ACTIVA' ? 'Entrar a la sala' : 'Ver la sala'}
              </ButtonLink>
            </div>
          ) : null}
        </section>
        {personal ? (
          <Notice tone="info" className={orientation === 'landscape' ? 'md:col-span-2' : ''}>
            <div>
              <span className="block font-medium">Proyecto propio, sin auditar</span>
              Su autor la subió para su galería personal. No pasó por la auditoría de autenticidad y no está a la venta.
            </div>
          </Notice>
        ) : (
          <>
            <ScoreRing score={lot.authenticityScore} verdict={summary?.verdict ?? null} />
            <p className={`px-1 text-sm leading-relaxed text-muted ${orientation === 'landscape' ? 'md:col-span-2' : ''}`}>
              {summary
                ? `${summary.hasCriticalInconsistency ? 'La auditoría encontró una inconsistencia crítica.' : 'La auditoría no encontró inconsistencias críticas.'} ${source ?? ''}.`
                : 'El reporte de autenticidad aparece cuando termina la auditoría.'}
            </p>
          </>
        )}
      </div>
    </article>
  );
}

function ArtworkFrame({
  src,
  alt,
  orientation,
  caption,
  onMeasure,
}: {
  src: string | null;
  alt: string;
  orientation: ImageOrientation | 'pending';
  caption: string;
  onMeasure: (width: number, height: number) => void;
}) {
  return (
    <figure className={`rounded-panel border border-line bg-surface p-3 shadow-panel sm:p-5 ${orientation === 'portrait' ? 'lg:sticky lg:top-24' : ''}`}>
      <div className="overflow-hidden rounded-field bg-paper-deep">
        {src ? (
          <img
            src={src}
            alt={alt}
            onLoad={(event) => { onMeasure(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight); }}
            className={imageClass(orientation)}
          />
        ) : (
          <div className="grid min-h-72 place-items-center bg-[linear-gradient(160deg,#f7f1e6,#e4d5c3)] px-6 text-center text-sm text-muted">
            Esta obra todavía no tiene una imagen publicada.
          </div>
        )}
      </div>
      <figcaption className="mt-3 flex items-center justify-between gap-3 px-1 text-[11px] uppercase tracking-[0.18em] text-muted">
        <span>{caption}</span>
        <span>{alt}</span>
      </figcaption>
    </figure>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-field bg-paper px-4 py-3">
      <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm leading-snug">{value}</dd>
    </div>
  );
}

function measures(lot: Lot): string {
  const width = numberOrNull(lot.widthCm);
  const height = numberOrNull(lot.heightCm);
  const depth = numberOrNull(lot.depthCm);
  if (width === null || height === null) {
    return 'Sin medidas en la ficha';
  }
  const base = `${formatCm(height)} × ${formatCm(width)} cm`;
  return depth === null ? base : `${base} × ${formatCm(depth)} cm`;
}

function numberOrNull(value: string | null | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatCm(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function sheetClass(orientation: ImageOrientation | 'pending'): string {
  if (orientation === 'portrait') {
    return 'grid items-start gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(18rem,1fr)]';
  }
  if (orientation === 'square') {
    return 'grid items-start gap-8 lg:grid-cols-2';
  }
  return 'grid gap-8';
}

function dossierClass(orientation: ImageOrientation | 'pending'): string {
  if (orientation === 'landscape') {
    return 'grid items-start gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.7fr)]';
  }
  return 'grid content-start gap-6';
}

function imageClass(orientation: ImageOrientation | 'pending'): string {
  if (orientation === 'portrait') {
    return 'mx-auto max-h-[82vh] w-auto max-w-full object-contain';
  }
  if (orientation === 'square') {
    return 'mx-auto max-h-[78vh] w-full max-w-3xl object-contain';
  }
  return 'max-h-[68vh] w-full object-contain sm:max-h-[72vh]';
}
