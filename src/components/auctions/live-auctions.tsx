'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArtworkImage } from '@/components/artwork-image';
import { ButtonLink } from '@/components/ui/button';
import { useFormat } from '@/hooks/use-format';
import { useRemaining } from '@/hooks/use-remaining';
import { artApi } from '@/lib/api/client';
import type { Lot } from '@/lib/api/types';
import { clockOffset } from '@/lib/clock';

// La cartelera cambia cada pocos minutos: se refresca sola y al volver a la pestaña.
const REFRESH_MS = 20_000;

type LiveLot = Lot & { auction: NonNullable<Lot['auction']> };

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: LiveLot[]; offsetMs: number };

/**
 * Salas activas y proximas. Las subastas rotativas del catalogo mantienen
 * siempre algunas en cartelera; cada tarjeta lleva a su sala.
 */
export function LiveAuctions({ limit = 8, showCatalogLink = false }: { limit?: number; showCatalogLink?: boolean }) {
  const t = useTranslations('LiveAuctions');
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: 'loading' });
  const pending = useRef(false);

  const refresh = useCallback(async () => {
    if (pending.current) {
      return;
    }
    pending.current = true;
    try {
      const live = await artApi.liveAuctions(limit);
      const items = live.items.filter((lot): lot is LiveLot => lot.auction !== null && lot.auction !== undefined);
      setState({ status: 'ready', items, offsetMs: clockOffset(live.serverTime) });
    } catch {
      setState((current) => (current.status === 'ready' ? current : { status: 'error' }));
    } finally {
      pending.current = false;
    }
    // Las fichas llegan en el idioma activo: al cambiarlo se vuelven a pedir.
  }, [limit, locale]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return (
    <section aria-labelledby="live-auctions-title" className="my-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-oxide">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-oxide" />
            {t('eyebrow')}
          </p>
          <h2 id="live-auctions-title" className="mt-1 font-serif text-3xl">
            {t('title')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('description')}</p>
        </div>
        {showCatalogLink ? (
          <ButtonLink href="/catalogo" variant="secondary" size="sm">
            {t('toCatalog')}
          </ButtonLink>
        ) : null}
      </div>
      {state.status === 'loading' ? <LiveSkeleton /> : null}
      {state.status === 'error' ? <p className="text-sm text-muted">{t('unavailable')}</p> : null}
      {state.status === 'ready' && state.items.length === 0 ? (
        <p className="rounded-panel border border-dashed border-line-strong px-6 py-8 text-center text-sm text-muted">
          {t('empty')}
        </p>
      ) : null}
      {state.status === 'ready' && state.items.length > 0 ? (
        <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {state.items.map((lot) => (
            <li key={lot.auction.id} className="w-64 shrink-0 snap-start lg:w-auto">
              <LiveCard lot={lot} offsetMs={state.offsetMs} onElapsed={() => void refresh()} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function LiveCard({ lot, offsetMs, onElapsed }: { lot: LiveLot; offsetMs: number; onElapsed: () => void }) {
  const t = useTranslations('LiveAuctions');
  const format = useFormat();
  const { auction } = lot;
  const live = auction.status === 'ACTIVA';
  const target = live ? auction.endsAt : (auction.startsAt ?? auction.endsAt);
  const { ms, label } = useRemaining(target, offsetMs);
  const elapsed = ms <= 0;

  // Cuando la sala abre o cierra, la cartelera se vuelve a pedir una sola vez.
  const notified = useRef(false);
  useEffect(() => {
    if (elapsed && !notified.current) {
      notified.current = true;
      onElapsed();
    }
  }, [elapsed, onElapsed]);

  return (
    <Link
      href={`/subasta/${auction.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-panel transition-shadow hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
        <ArtworkImage src={lot.images?.[0]?.url ?? null} alt="" cover />
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            live ? 'bg-oxide text-white' : 'bg-surface/95 text-ink'
          }`}
        >
          {live ? <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> : null}
          {live ? t('live') : t('upcoming')}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-serif text-lg leading-snug group-hover:underline">{lot.title}</h3>
        <p className="mt-0.5 truncate text-xs text-muted">{lot.artistName ?? t('unattributedArtist')}</p>
        <dl className="mt-auto flex items-end pt-3 justify-between gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted">{live ? t('currentPrice') : t('openingPrice')}</dt>
            <dd className="font-medium">{format.artacoins(auction.currentPrice)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-xs text-muted">{live ? t('closesIn') : t('opensIn')}</dt>
            <dd className="font-medium tabular-nums">{elapsed ? (live ? t('closing') : t('opening')) : label}</dd>
          </div>
        </dl>
        {auction.buyNowPrice && (auction.buyNowAvailable || !live) ? (
          <p className="mt-2 text-xs text-muted">
            {t('buyNow')} <span className="font-medium text-ink">{format.artacoins(auction.buyNowPrice)}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function LiveSkeleton() {
  return (
    <ul aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <li key={index} className="h-72 animate-pulse rounded-panel bg-paper-deep" />
      ))}
    </ul>
  );
}
