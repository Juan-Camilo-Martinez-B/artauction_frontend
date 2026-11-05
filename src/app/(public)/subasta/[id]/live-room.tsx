'use client';

import { Gavel, ShoppingBag, Undo2, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { ArtworkImage } from '@/components/artwork-image';
import { StatusPill } from '@/components/status-pill';
import { Button, ButtonLink } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, LoadingState, Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { useErrorText } from '@/hooks/use-error-text';
import { useRemaining } from '@/hooks/use-remaining';
import { artApi } from '@/lib/api/client';
import type { Auction, WalletSnapshot } from '@/lib/api/types';
import { buyNowOpen, buyNowThreshold } from '@/lib/auction/buy-now';
import { canWithdraw } from '@/lib/auction/policy';
import { bidderLabels, mergeBid, nextMinimumBid, quickBids, type BidderLabel, type RoomPhase } from '@/lib/auction/room';
import { useFormat } from '@/hooks/use-format';
import { loginHref } from '@/lib/session/next-path';
import { browserSession, type SessionSnapshot } from '@/lib/session/browser-session';
import { useLiveAuction } from './use-live-auction';

const onlyDigits = (raw: string) => raw.replace(/\D+/g, '').slice(0, 9);

/**
 * Sala de subasta: la pantalla y las acciones de quien la mira (pujar,
 * retirarse, comprar ahora). El estado vivo de la sala lo mantiene
 * useLiveAuction.
 */
export function LiveRoom({ auctionId }: { auctionId: string }) {
  const t = useTranslations('Room');
  const errorText = useErrorText();
  const format = useFormat();
  const notify = useToast();
  const { auction, lot, loadError, offsetMs, connected, wallet, session, phase, reload, updateAuction, refreshWallet } = useLiveAuction(auctionId);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [confirmBuyNow, setConfirmBuyNow] = useState(false);
  const [buying, setBuying] = useState(false);
  // Una clave por intento de compra: si la respuesta se pierde y se reintenta,
  // el servidor reconoce la misma compra y no cobra dos veces.
  const buyKey = useRef<string | null>(null);

  const minimum = auction ? nextMinimumBid(auction) : 0;

  // La oferta propuesta sigue a la minima mientras la persona no escriba otra mayor.
  useEffect(() => {
    setAmount((current) => (Number(current) >= minimum ? current : String(minimum)));
  }, [minimum]);

  async function onBid(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (Number(amount) < minimum) {
      setError(t('minimumBid', { amount: format.artacoins(minimum) }));
      return;
    }
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    setPending(true);
    try {
      const placed = await artApi.placeBid(token, auctionId, amount, crypto.randomUUID());
      updateAuction((current) => ({
        ...current,
        currentPrice: placed.currentPrice,
        endsAt: placed.endsAt,
        bids: mergeBid(current.bids ?? [], { id: placed.bidId, bidderId: session.profile?.userId ?? '', amount: placed.amount, createdAt: new Date(Date.now() + offsetMs).toISOString(), active: true }),
      }));
      notify(placed.extended ? t('bidExtended') : t('bidAccepted', { amount: format.artacoins(placed.amount) }), 'success');
      await refreshWallet(token);
    } catch (caught) {
      setError(errorText(caught, t('bidFailed')));
    } finally {
      setPending(false);
    }
  }

  async function onWithdraw() {
    setConfirmWithdraw(false);
    setError(null);
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    try {
      const result = await artApi.withdrawBid(token, auctionId);
      notify(t('withdrawn', { amount: format.artacoins(result.released) }), 'success');
      await reload();
      await refreshWallet(token);
    } catch (caught) {
      setError(errorText(caught, t('withdrawFailed')));
    }
  }

  function openBuyNow() {
    setError(null);
    buyKey.current ??= crypto.randomUUID();
    setConfirmBuyNow(true);
  }

  async function onBuyNow() {
    const key = buyKey.current;
    const token = await browserSession.accessToken();
    if (!token || !key) {
      return;
    }
    setBuying(true);
    try {
      const bought = await artApi.buyNow(token, auctionId, key);
      buyKey.current = null;
      setConfirmBuyNow(false);
      updateAuction((current) => ({ ...current, status: 'CERRADA', currentPrice: bought.amount, winnerId: session.profile?.userId ?? null, closedBy: 'BUY_NOW', buyNowAvailable: false }));
      notify(t('bought', { amount: format.artacoins(bought.amount) }), 'success');
      await refreshWallet(token);
    } catch (caught) {
      setConfirmBuyNow(false);
      setError(errorText(caught, t('buyFailed')));
      await reload();
    } finally {
      setBuying(false);
    }
  }

  if (loadError) {
    return <EmptyState icon={<Gavel aria-hidden="true" className="h-6 w-6" />} title={t('unavailable.title')} description={t('unavailable.description')} action={<ButtonLink href="/catalogo">{t('unavailable.action')}</ButtonLink>} />;
  }
  if (!auction || !phase) {
    return <LoadingState label={t('preparing')} />;
  }

  const viewerId = session.profile?.userId ?? null;
  const labels = bidderLabels(auction.bids ?? [], viewerId);
  const bidderName = (label: BidderLabel | undefined) => (label?.kind === 'bidder' ? t('bidder', { number: label.number }) : t('you'));
  const history = [...(auction.bids ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const leader = history.find((bid) => bid.active !== false);
  const isSeller = viewerId !== null && viewerId === auction.sellerId;
  const myActiveBid = history.some((bid) => bid.active !== false && bid.bidderId === viewerId);
  const withdrawAllowed = phase === 'live' && myActiveBid && canWithdraw(new Date(Date.now() + offsetMs), new Date(auction.endsAt));
  const canBuyNow = phase === 'live' && buyNowOpen(auction, Date.now() + offsetMs);
  const balance = wallet?.balance ?? null;
  // Lo que ya tienes retenido en esta sala cuenta para la compra.
  const myHold = Math.max(0, ...history.filter((bid) => bid.active !== false && bid.bidderId === viewerId).map((bid) => Number(bid.amount)));
  const buyNowShort = balance !== null && auction.buyNowPrice !== undefined && Number(auction.buyNowPrice) - myHold > balance;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
      <section aria-labelledby="room-title">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-oxide">{t('eyebrow')}</p>
        <h1 id="room-title" className="mt-1 font-serif text-4xl leading-tight md:text-5xl">
          {lot?.title ?? t('fallbackTitle')}
        </h1>
        {lot ? (
          <p className="mt-2 text-muted">
            {lot.artistName ?? t('unattributedArtist')}
            {lot.creationYear ? ` · ${String(lot.creationYear)}` : ''}
          </p>
        ) : null}
        <div className="mt-6 overflow-hidden rounded-panel border border-line bg-surface p-3 shadow-panel">
          <div className="overflow-hidden rounded-field bg-paper-deep">
            <ArtworkImage src={lot?.images?.[0]?.url ?? null} alt={lot?.title ?? t('workAlt')} featured />
          </div>
        </div>
        {/* Se guarda en el idioma del autor: con la ficha traducida se muestra su descripcion. */}
        {lot?.translated ? (
          <p className="mt-6 max-w-prose leading-relaxed">{lot.description}</p>
        ) : auction.saleDescription ? (
          <p className="mt-6 max-w-prose leading-relaxed">{auction.saleDescription}</p>
        ) : null}
        {lot ? (
          <Link href={`/obras/${lot.id}`} className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
            {t('seeSheet')}
          </Link>
        ) : null}
      </section>

      <div className="space-y-6 lg:sticky lg:top-24">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <StatusPill status={auction.status} />
            {session.status === 'authenticated' ? (
              <span className={`inline-flex items-center gap-1.5 text-xs ${connected ? 'text-moss' : 'text-muted'}`}>
                {connected ? <Wifi aria-hidden="true" className="h-3.5 w-3.5" /> : <WifiOff aria-hidden="true" className="h-3.5 w-3.5" />}
                {connected ? t('live') : t('connecting')}
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-sm text-muted">{leader ? t('highestBid') : t('openingPrice')}</p>
          <p className="font-serif text-5xl tabular-nums">{format.artacoins(auction.currentPrice)}</p>
          {leader ? (
            <p className="mt-1 text-sm text-muted">
              {labels.get(leader.bidderId)?.kind === 'you' ? t('leaderYou') : t('leader', { bidder: bidderName(labels.get(leader.bidderId)) })}
            </p>
          ) : null}
          <PhaseClock auction={auction} phase={phase} offsetMs={offsetMs} viewerId={viewerId} />
        </Panel>

        <Panel>
          <BidArea
            phase={phase}
            session={session}
            auctionId={auctionId}
            isSeller={isSeller}
            minimum={minimum}
            increment={Math.round(Number(auction.minIncrement))}
            amount={amount}
            onAmount={setAmount}
            pending={pending}
            wallet={wallet}
            onSubmit={(event) => void onBid(event)}
          />
          <BuyNowArea
            auction={auction}
            phase={phase}
            authenticated={session.status === 'authenticated'}
            isSeller={isSeller}
            available={canBuyNow}
            onOpen={openBuyNow}
          />
          {error ? <Notice tone="error" className="mt-4">{error}</Notice> : null}
          {withdrawAllowed ? (
            <Button variant="ghost" className="mt-3" icon={<Undo2 aria-hidden="true" className="h-4 w-4" />} onClick={() => { setConfirmWithdraw(true); }}>
              {t('withdraw')}
            </Button>
          ) : null}
        </Panel>

        <Panel>
          <h2 className="font-serif text-xl">{t('history')}</h2>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t('noBids', { amount: format.artacoins(minimum) })}</p>
          ) : (
            <ol className="mt-3 divide-y divide-line text-sm">
              {history.slice(0, 12).map((bid) => (
                <li key={bid.id} className={`flex items-baseline justify-between gap-3 py-2 ${bid.active === false ? 'text-muted line-through' : ''}`}>
                  <span className={labels.get(bid.bidderId)?.kind === 'you' ? 'font-medium' : ''}>
                    {bidderName(labels.get(bid.bidderId))}
                    {bid.buyNow ? <span className="ml-2 text-xs uppercase tracking-wide text-oxide">{t('buyNowTag')}</span> : null}
                  </span>
                  <span className="tabular-nums">{format.artacoins(bid.amount)}</span>
                  <time dateTime={bid.createdAt} className="w-24 text-right text-xs text-muted">
                    {format.relative(bid.createdAt, new Date(Date.now() + offsetMs))}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmWithdraw}
        title={t('withdrawDialog.title')}
        confirmLabel={t('withdrawDialog.confirm')}
        tone="danger"
        onCancel={() => { setConfirmWithdraw(false); }}
        onConfirm={() => void onWithdraw()}
      >
        {t('withdrawDialog.body')}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmBuyNow}
        title={t('buyDialog.title')}
        confirmLabel={t('buyDialog.confirm', { price: format.artacoins(auction.buyNowPrice ?? 0) })}
        tone="accent"
        confirmDisabled={buyNowShort}
        confirmLoading={buying}
        onCancel={() => { setConfirmBuyNow(false); }}
        onConfirm={() => void onBuyNow()}
      >
        <p>
          {t.rich('buyDialog.body', { price: format.artacoins(auction.buyNowPrice ?? 0), strong: (chunks) => <strong className="text-ink">{chunks}</strong> })}
        </p>
        {balance !== null ? (
          <p className={`mt-2 ${buyNowShort ? 'text-oxide' : ''}`}>
            {t('available', { amount: format.artacoins(balance) })}
            {myHold > 0 ? ` ${t('heldHere', { amount: format.artacoins(myHold) })}` : ''}.{' '}
            {buyNowShort ? (
              <Link href="/bolsillo" className="font-medium underline underline-offset-4">
                {t('topUp')}
              </Link>
            ) : null}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

/** Reloj de la sala: cuanto falta para abrir o cerrar, o el resultado si ya cerro. */
function PhaseClock({ auction, phase, offsetMs, viewerId }: { auction: Auction; phase: RoomPhase; offsetMs: number; viewerId: string | null }) {
  const t = useTranslations('Room.clock');
  const target = phase === 'upcoming' ? (auction.startsAt ?? auction.endsAt) : auction.endsAt;
  const { label } = useRemaining(target, offsetMs);
  if (phase === 'closed') {
    const mine = auction.winnerId !== null && auction.winnerId === viewerId;
    const buyNow = auction.closedBy === 'BUY_NOW';
    const text =
      auction.winnerId === null
        ? t('unsold')
        : buyNow
          ? mine
            ? t('youBought')
            : t('soldBuyNow')
          : mine
            ? t('youWon')
            : t('closedWithWinner');
    return <Notice tone={auction.winnerId === viewerId ? 'success' : 'info'} className="mt-4">{text}</Notice>;
  }
  if (phase === 'opening' || phase === 'closing') {
    return (
      <p className="mt-4 text-sm text-muted" role="status">
        {phase === 'opening' ? t('opening') : t('closing')}
      </p>
    );
  }
  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-sm text-muted">{phase === 'upcoming' ? t('opensIn') : t('closesIn')}</p>
      <p className="font-serif text-3xl tabular-nums" role="timer" aria-live="off">
        {label}
      </p>
    </div>
  );
}

function BidArea({
  phase,
  session,
  auctionId,
  isSeller,
  minimum,
  increment,
  amount,
  onAmount,
  pending,
  wallet,
  onSubmit,
}: {
  phase: RoomPhase;
  session: SessionSnapshot;
  auctionId: string;
  isSeller: boolean;
  minimum: number;
  increment: number;
  amount: string;
  onAmount: (value: string) => void;
  pending: boolean;
  wallet: WalletSnapshot | null;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}) {
  const t = useTranslations('Room.bid');
  const format = useFormat();
  if (session.status !== 'authenticated') {
    return (
      <div>
        <h2 className="font-serif text-xl">{t('wantToBid')}</h2>
        <p className="mt-1 text-sm text-muted">{t('signInHint')}</p>
        <ButtonLink href={loginHref(`/subasta/${auctionId}`)} className="mt-4 w-full">
          {t('signIn')}
        </ButtonLink>
      </div>
    );
  }
  if (isSeller) {
    return <Notice>{t('ownWork')}</Notice>;
  }
  if (phase !== 'live') {
    return (
      <p className="text-sm text-muted">
        {phase === 'upcoming' || phase === 'opening' ? t('notYet') : t('noMore')}
      </p>
    );
  }
  const balance = wallet?.balance ?? null;
  const short = balance !== null && Number(amount) > balance;
  return (
    <form noValidate onSubmit={onSubmit}>
      <TextField
        id="bid-amount"
        label={t('amountLabel')}
        inputMode="numeric"
        value={amount}
        format={onlyDigits}
        onValueChange={onAmount}
        hint={t('minimum', { amount: format.artacoins(minimum) })}
      />
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t('quick')}>
        {quickBids(minimum, increment).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => { onAmount(String(value)); }}
            aria-pressed={Number(amount) === value}
            className={`rounded-full border px-3 py-1 text-sm tabular-nums ${Number(amount) === value ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink'}`}
          >
            {format.integer(value)}
          </button>
        ))}
      </div>
      {balance !== null ? (
        <p className={`mt-3 text-sm ${short ? 'text-oxide' : 'text-muted'}`}>
          {t('available', { amount: format.artacoins(balance) })}{' '}
          {short ? (
            <Link href="/bolsillo" className="font-medium underline underline-offset-4">
              {t('topUp')}
            </Link>
          ) : (
            t('onlyIncrease')
          )}
        </p>
      ) : null}
      <Button type="submit" variant="accent" loading={pending} className="mt-4 w-full" icon={<Gavel aria-hidden="true" className="h-4 w-4" />}>
        {amount ? t('submitAmount', { amount: format.artacoins(Number(amount)) }) : t('submit')}
      </Button>
    </form>
  );
}

/**
 * Compra inmediata: un boton aparte del formulario de puja. Mientras la sala no
 * abre se anuncia el precio; cuando una puja llega al 80 % deja de ofrecerse.
 */
function BuyNowArea({
  auction,
  phase,
  authenticated,
  isSeller,
  available,
  onOpen,
}: {
  auction: Auction;
  phase: RoomPhase;
  authenticated: boolean;
  isSeller: boolean;
  available: boolean;
  onOpen: () => void;
}) {
  const t = useTranslations('Room.buyNow');
  const format = useFormat();
  if (!auction.buyNowPrice || phase === 'closed' || phase === 'closing') {
    return null;
  }
  const price = format.artacoins(auction.buyNowPrice);
  if (phase !== 'live') {
    return <p className="mt-4 border-t border-line pt-4 text-sm text-muted">{t('whenOpen', { price })}</p>;
  }
  if (!available) {
    return (
      <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
        {t('exceeded', { threshold: format.artacoins(Math.ceil(buyNowThreshold(auction.buyNowPrice))), price })}
      </p>
    );
  }
  if (!authenticated || isSeller) {
    return <p className="mt-4 border-t border-line pt-4 text-sm text-muted">{t('price', { price })}</p>;
  }
  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-sm text-muted">{t('pitch')}</p>
      <Button variant="primary" className="mt-3 w-full" icon={<ShoppingBag aria-hidden="true" className="h-4 w-4" />} onClick={onOpen}>
        {t('action', { price })}
      </Button>
    </div>
  );
}
