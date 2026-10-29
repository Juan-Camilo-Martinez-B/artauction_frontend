'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ScoreRing } from '@/components/score-ring';
import { StatusPill } from '@/components/status-pill';
import { ImageFormat, type ImageOrientation } from '@/lib/artwork/image-format';
import { formatArtacoins } from '@/lib/auction/policy';
import { formatMoney } from '@/lib/money';
import type { Lot } from '@/lib/api/types';
import { AddToGalleryButton } from './add-to-gallery';

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
        <section className="rounded-[1.75rem] border border-line bg-white p-6 shadow-[0_18px_40px_-32px_rgba(27,24,20,0.45)] sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={lot.status} />
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
            <Fact
              label="Banda sugerida"
              value={`${formatMoney(lot.suggestedPriceMin)} – ${formatMoney(lot.suggestedPriceMax)}`}
            />
          </dl>
          {lot.auction?.saleDescription ? (
            <p className="mt-6 max-w-prose leading-relaxed">{lot.auction.saleDescription}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <AddToGalleryButton lotId={lot.id} />
            {lot.auction && (lot.status === 'EN_SUBASTA' || lot.status === 'PUBLICADA') ? (
              <Link href={`/subasta/${lot.auction.id}`} className="rounded-full bg-ink px-5 py-2 text-sm text-paper">
                {lot.status === 'EN_SUBASTA' ? 'Entrar a la sala' : 'Ver la subasta'}
              </Link>
            ) : null}
          </div>
          {lot.auction ? (
            <p className="mt-4 text-sm text-muted">
              {formatArtacoins(lot.auction.currentPrice)}
              {lot.auction.startsAt ? ` · abre ${new Date(lot.auction.startsAt).toLocaleString('es-CO')}` : ''}
            </p>
          ) : null}
        </section>
        <ScoreRing score={lot.authenticityScore} verdict={summary?.verdict ?? null} />
        <p className={`px-1 text-sm leading-relaxed text-muted ${orientation === 'landscape' ? 'md:col-span-2' : ''}`}>
          {summary
            ? `Modelo ${summary.modelName}, prompt ${summary.promptVersion}. ${summary.hasCriticalInconsistency ? 'Hay una inconsistencia crítica.' : 'Sin inconsistencia crítica.'}`
            : 'El reporte completo llega cuando termina la auditoría.'}
        </p>
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
    <figure className={`rounded-[1.75rem] bg-white p-3 shadow-[0_24px_60px_-36px_rgba(27,24,20,0.7)] sm:p-5 ${orientation === 'portrait' ? 'lg:sticky lg:top-6' : ''}`}>
      <div className="overflow-hidden rounded-[1.25rem] bg-[#e7e0d2]">
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
    <div className="rounded-2xl bg-paper px-4 py-3">
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
