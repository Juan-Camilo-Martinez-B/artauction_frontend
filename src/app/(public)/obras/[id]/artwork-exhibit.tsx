'use client';

import { BadgeCheck, Gavel } from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ScoreRing } from '@/components/score-ring';
import { StatusPill } from '@/components/status-pill';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { useCategoryName } from '@/hooks/use-category-name';
import { useFormat } from '@/hooks/use-format';
import type { Lot, LotModel, LotTexts } from '@/lib/api/types';
import { ImageFormat, type ImageOrientation } from '@/lib/artwork/image-format';
import { auditSource, isPersonal, isReturned, type AuditSource } from '@/lib/artwork/lot-review';

// WebGL solo existe en el navegador: el visor se carga aparte y sin SSR.
const ModelViewer = dynamic(() => import('@/components/gallery3d/model-viewer').then((module) => module.ModelViewer), {
  ssr: false,
  loading: () => <ModelLoading />,
});

function ModelLoading() {
  const t = useTranslations('Artwork');
  return <div className="grid h-full place-items-center text-sm text-muted">{t('preparingModel')}</div>;
}

/** Datos de la compra cuando la ficha es la que guardo la galeria del comprador. */
export interface PurchaseInfo {
  pricePaid: string | null;
  buyNow: boolean | null;
  acquiredAt: string | null;
}

/**
 * Textos que se muestran: los traducidos o, si la persona lo pide, los del
 * autor. Sin traduccion no hay nada que alternar.
 */
function shownTexts(lot: Lot, showOriginal: boolean): LotTexts {
  if (showOriginal && lot.original) {
    return lot.original;
  }
  return { title: lot.title, description: lot.description, materials: lot.materials, provenance: lot.provenance ?? null };
}

export function ArtworkExhibit({ lot, purchase = null }: { lot: Lot; purchase?: PurchaseInfo | null }) {
  const t = useTranslations('Artwork');
  const formatter = useFormat();
  const categoryName = useCategoryName();
  const [showOriginal, setShowOriginal] = useState(false);
  const image = lot.images?.find((item) => item.url)?.url ?? null;
  const [format, setFormat] = useState<ImageFormat | null>(null);
  const photoOrientation = format?.orientation() ?? 'pending';
  // Una obra con modelo 3D conserva sus dos columnas: la estructura no depende de la vista elegida ni de la foto.
  const orientation = lot.model?.url ? 'portrait' : photoOrientation;
  const category = categoryName(lot.categories?.find((link) => link.isPrimary)?.category) ?? t('noCategory');
  const representation =
    lot.representationKind === 'THREE_D' ? t('threeD') : lot.representationKind === 'TWO_D' ? t('twoD') : t('unclassified');
  const summary = lot.auditSummaries?.[0];
  const source = auditSource(summary, lot);
  // Un proyecto propio no se audita ni se vende: no tiene score, precio ni sala.
  const personal = isPersonal(lot);
  const texts = shownTexts(lot, showOriginal);

  return (
    <article className={sheetClass(orientation)}>
      <ArtworkFrame
        src={image}
        model={lot.model?.url ? lot.model : null}
        alt={texts.title}
        orientation={orientation}
        photoOrientation={photoOrientation}
        caption={format ? t(`format.${format.orientation()}`) : t('work')}
        onMeasure={(width, height) => { setFormat(new ImageFormat(width, height)); }}
      />
      <div className={dossierClass(orientation)}>
        <section className="rounded-panel border border-line bg-surface p-6 shadow-panel sm:p-8">
          {isReturned(lot) ? (
            // Una obra en borrador solo la ve quien la publico (o un administrador).
            <Notice tone="info" className="mb-5">
              <div>
                <span className="block font-medium">{t('returned')}</span>
                {lot.lastReview?.reason ? <span className="block">{lot.lastReview.reason}</span> : null}
                <ButtonLink href={`/publicar/${lot.id}`} size="sm" className="mt-3">
                  {t('editAndResend')}
                </ButtonLink>
              </div>
            </Notice>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={isReturned(lot) ? 'DEVUELTA' : lot.status} />
            {personal ? <span className="text-xs uppercase tracking-[0.18em] text-muted">{t('notAudited')}</span> : null}
            <span className="text-xs uppercase tracking-[0.18em] text-oxide">{category}</span>
          </div>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl" lang={showOriginal ? (lot.sourceLocale ?? undefined) : undefined}>
            {texts.title}
          </h1>
          {lot.translated && lot.original ? (
            <TranslationLine showOriginal={showOriginal} onToggle={() => { setShowOriginal((current) => !current); }} />
          ) : null}
          <p className="mt-3 text-lg text-muted">
            {lot.artistName ?? t('unattributed')}
            <span className="text-ink"> · {lot.creationYear ?? t('unknownYear')}</span>
          </p>
          <p className="mt-6 max-w-prose text-base leading-relaxed sm:text-lg">{texts.description}</p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <Fact label={t('facts.materials')} value={texts.materials} />
            <Fact label={t('facts.presentation')} value={representation} />
            <Fact label={t('facts.measures')} value={measures(lot, formatter.decimal) ?? t('facts.noMeasures')} />
            <Fact label={t('facts.provenance')} value={texts.provenance?.trim() || t('facts.noProvenance')} />
            {personal ? null : (
              <Fact label={t('facts.priceBand')} value={`${formatter.money(lot.suggestedPriceMin)} – ${formatter.money(lot.suggestedPriceMax)}`} />
            )}
          </dl>
          {/* Se guarda en el idioma del autor: repite la ficha, asi que con la ficha traducida no se muestra. */}
          {lot.auction?.saleDescription && !lot.translated ? <p className="mt-6 max-w-prose leading-relaxed">{lot.auction.saleDescription}</p> : null}
          {lot.auction && lot.auction.status !== 'CERRADA' ? <AuctionCall auction={lot.auction} /> : null}
        </section>
        {purchase ? <PurchaseNotice purchase={purchase} wide={orientation === 'landscape'} /> : null}
        {personal ? (
          <Notice tone="info" className={orientation === 'landscape' ? 'md:col-span-2' : ''}>
            <div>
              <span className="block font-medium">{t('personalTitle')}</span>
              {t('personalText')}
            </div>
          </Notice>
        ) : (
          <>
            <ScoreRing score={lot.authenticityScore} verdict={summary?.verdict ?? null} />
            <p className={`px-1 text-sm leading-relaxed text-muted ${orientation === 'landscape' ? 'md:col-span-2' : ''}`}>
              {summary
                ? `${summary.hasCriticalInconsistency ? t('audit.critical') : t('audit.clean')} ${source ? `${sourceText(t, source)}.` : ''}`
                : purchase
                  ? t('audit.soldWith')
                  : t('audit.pending')}
            </p>
          </>
        )}
      </div>
    </article>
  );
}

/**
 * "Traducido automaticamente · Ver original": alterna la ficha en el mismo
 * lugar. Lo que vale es el texto del autor.
 */
function TranslationLine({ showOriginal, onToggle }: { showOriginal: boolean; onToggle: () => void }) {
  const t = useTranslations('Artwork.translation');
  return (
    <p className="mt-2 text-xs text-muted">
      {showOriginal ? t('original') : t('automatic')}
      {' · '}
      <button type="button" aria-pressed={showOriginal} onClick={onToggle} className="font-medium text-ink underline underline-offset-4 hover:text-oxide">
        {showOriginal ? t('showTranslation') : t('showOriginal')}
      </button>
    </p>
  );
}

type ArtworkTranslator = ReturnType<typeof useTranslations<'Artwork'>>;

function sourceText(t: ArtworkTranslator, source: AuditSource): string {
  return source.kind === 'ai' ? t('source.ai', { model: source.model }) : t(`source.${source.kind}`);
}

function AuctionCall({ auction }: { auction: NonNullable<Lot['auction']> }) {
  const t = useTranslations('Artwork.auction');
  const formatter = useFormat();
  const active = auction.status === 'ACTIVA';
  const price = formatter.artacoins(auction.currentPrice);
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-field border border-line bg-paper p-4">
      <p className="text-sm">
        <span className="block font-medium">{active ? t('openNow') : t('scheduled')}</span>
        <span className="text-muted">
          {active
            ? t('currentPrice', { price })
            : auction.startsAt
              ? t('openingAt', { price, date: formatter.dateTime(auction.startsAt) })
              : t('openingPrice', { price })}
        </span>
        {auction.buyNowPrice && (auction.buyNowAvailable || !active) ? (
          <span className="block text-muted">
            {t('buyNow')} <span className="font-medium text-ink">{formatter.artacoins(auction.buyNowPrice)}</span>
            {active ? '' : ` ${t('buyNowWhenOpen')}`}
          </span>
        ) : null}
      </p>
      <ButtonLink href={`/subasta/${auction.id}`} variant={active ? 'accent' : 'secondary'} icon={<Gavel aria-hidden="true" className="h-4 w-4" />}>
        {active ? t('enterRoom') : t('seeRoom')}
      </ButtonLink>
    </div>
  );
}

/** Certificado de la compra: como se compro, cuando y, solo para su duena, por cuanto. */
function PurchaseNotice({ purchase, wide }: { purchase: PurchaseInfo; wide: boolean }) {
  const t = useTranslations('Artwork.purchase');
  const formatter = useFormat();
  const how = purchase.buyNow === true ? t('byBuyNow') : purchase.buyNow === false ? t('atAuction') : t('onArtAuction');
  return (
    <Notice tone="success" className={wide ? 'md:col-span-2' : ''}>
      <div>
        <span className="block font-medium">{t('title')}</span>
        {t('bought', { how })}
        {purchase.acquiredAt ? ` ${t('on', { date: formatter.dateTime(purchase.acquiredAt) })}` : ''}
        {purchase.pricePaid ? ` ${t('for', { price: formatter.artacoins(purchase.pricePaid) })}` : ''}. {t('snapshot')}
      </div>
    </Notice>
  );
}

function ArtworkFrame({
  src,
  model,
  alt,
  orientation,
  photoOrientation,
  caption,
  onMeasure,
}: {
  src: string | null;
  model: LotModel | null;
  alt: string;
  /** Estructura de la ficha. */
  orientation: ImageOrientation | 'pending';
  /** Forma de la foto: decide como se ajusta la imagen. */
  photoOrientation: ImageOrientation | 'pending';
  caption: string;
  onMeasure: (width: number, height: number) => void;
}) {
  const t = useTranslations('Artwork');
  const formatter = useFormat();
  // Un objeto se presenta por su modelo 3D; la foto queda como segunda vista.
  const [view, setView] = useState<'photo' | 'model'>(model?.url ? 'model' : 'photo');
  const showModel = model?.url != null && view === 'model';
  return (
    <figure className={`rounded-panel border border-line bg-surface p-3 shadow-panel sm:p-5 ${orientation === 'portrait' ? 'lg:sticky lg:top-24' : ''}`}>
      {model?.url && src ? (
        <div className="mb-3 inline-flex rounded-field border border-line bg-paper p-1 text-sm" role="group" aria-label={t('view')}>
          {(['photo', 'model'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => { setView(option); }}
              className={`rounded-[0.6rem] px-3 py-1.5 transition ${view === option ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}
            >
              {option === 'photo' ? t('photo') : t('model')}
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
            className={imageClass(photoOrientation)}
          />
        ) : (
          <div className="grid min-h-72 place-items-center bg-[linear-gradient(160deg,#f7f1e6,#e4d5c3)] px-6 text-center text-sm text-muted">
            {t('noImage')}
          </div>
        )}
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] uppercase tracking-[0.18em] text-muted">
        <span>{showModel ? t('model') : caption}</span>
        <span>{alt}</span>
      </figcaption>
      {model ? (
        <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-moss">
          <BadgeCheck aria-hidden="true" className="h-4 w-4" />
          {t('verifiedModel', { triangles: formatter.integer(model.triangleCount) })}
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

/** "alto × ancho × fondo cm" con los decimales del idioma; null si faltan medidas. */
function measures(lot: Lot, decimal: (value: number) => string): string | null {
  const width = numberOrNull(lot.widthCm);
  const height = numberOrNull(lot.heightCm);
  const depth = numberOrNull(lot.depthCm);
  if (width === null || height === null) {
    return null;
  }
  const base = `${decimal(height)} × ${decimal(width)} cm`;
  return depth === null ? base : `${base} × ${decimal(depth)} cm`;
}

function numberOrNull(value: string | null | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
