'use client';

import { BadgeCheck, Gavel } from 'lucide-react';
import dynamic from 'next/dynamic';
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
import type { Lot, LotModel } from '@/lib/api/types';

// WebGL solo existe en el navegador: el visor se carga aparte y sin SSR.
const ModelViewer = dynamic(() => import('@/components/gallery3d/model-viewer').then((module) => module.ModelViewer), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Preparando el modelo 3D…</div>,
});

/** Datos de la compra cuando la ficha es la que guardo la galeria del comprador. */
export interface PurchaseInfo {
  pricePaid: string | null;
  buyNow: boolean | null;
  acquiredAt: string | null;
}

export function ArtworkExhibit({ lot, purchase = null }: { lot: Lot; purchase?: PurchaseInfo | null }) {
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
        model={lot.model?.url ? lot.model : null}
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
                {lot.auction.buyNowPrice && (lot.auction.buyNowAvailable || lot.auction.status !== 'ACTIVA') ? (
                  <span className="block text-muted">
                    Compra inmediata: <span className="font-medium text-ink">{formatArtacoins(lot.auction.buyNowPrice)}</span>
                    {lot.auction.status === 'ACTIVA' ? '' : ' al abrir la sala'}
                  </span>
                ) : null}
              </p>
              <ButtonLink href={`/subasta/${lot.auction.id}`} variant={lot.auction.status === 'ACTIVA' ? 'accent' : 'secondary'} icon={<Gavel aria-hidden="true" className="h-4 w-4" />}>
                {lot.auction.status === 'ACTIVA' ? 'Entrar a la sala' : 'Ver la sala'}
              </ButtonLink>
            </div>
          ) : null}
        </section>
        {purchase ? <PurchaseNotice purchase={purchase} wide={orientation === 'landscape'} /> : null}
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
                : purchase
                  ? 'Score de autenticidad con el que se vendió la obra.'
                  : 'El reporte de autenticidad aparece cuando termina la auditoría.'}
            </p>
          </>
        )}
      </div>
    </article>
  );
}

/** Certificado de la compra: como se compro, cuando y, solo para su duena, por cuanto. */
function PurchaseNotice({ purchase, wide }: { purchase: PurchaseInfo; wide: boolean }) {
  const how = purchase.buyNow === true ? 'por compra inmediata' : purchase.buyNow === false ? 'en subasta' : 'en ArtAuction';
  return (
    <Notice tone="success" className={wide ? 'md:col-span-2' : ''}>
      <div>
        <span className="block font-medium">Ficha guardada de la compra</span>
        Comprada {how}
        {purchase.acquiredAt ? ` el ${formatDateTime(purchase.acquiredAt)}` : ''}
        {purchase.pricePaid ? ` por ${formatArtacoins(purchase.pricePaid)}` : ''}. Es la ficha de la obra tal como estaba al venderse.
      </div>
    </Notice>
  );
}

function ArtworkFrame({
  src,
  model,
  alt,
  orientation,
  caption,
  onMeasure,
}: {
  src: string | null;
  model: LotModel | null;
  alt: string;
  orientation: ImageOrientation | 'pending';
  caption: string;
  onMeasure: (width: number, height: number) => void;
}) {
  // Un objeto se presenta por su modelo 3D; la foto queda como segunda vista.
  const [view, setView] = useState<'photo' | 'model'>(model?.url ? 'model' : 'photo');
  const showModel = model?.url != null && view === 'model';
  return (
    <figure className={`rounded-panel border border-line bg-surface p-3 shadow-panel sm:p-5 ${orientation === 'portrait' ? 'lg:sticky lg:top-24' : ''}`}>
      {model?.url && src ? (
        <div className="mb-3 inline-flex rounded-field border border-line bg-paper p-1 text-sm" role="group" aria-label="Vista de la obra">
          {(['photo', 'model'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => { setView(option); }}
              className={`rounded-[0.6rem] px-3 py-1.5 transition ${view === option ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}
            >
              {option === 'photo' ? 'Foto' : 'Modelo 3D'}
            </button>
          ))}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-field bg-paper-deep">
        {showModel && model.url ? (
          <ModelViewer url={model.url} title={alt} className="h-[60vh] min-h-80 w-full" />
        ) : src ? (
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
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] uppercase tracking-[0.18em] text-muted">
        <span>{showModel ? 'Modelo 3D' : caption}</span>
        <span>{alt}</span>
      </figcaption>
      {model ? (
        <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-moss">
          <BadgeCheck aria-hidden="true" className="h-4 w-4" />
          Modelo 3D verificado · {model.triangleCount.toLocaleString('es-CO')} triángulos
        </p>
      ) : null}
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
