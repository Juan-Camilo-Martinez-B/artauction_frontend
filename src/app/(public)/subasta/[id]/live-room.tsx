'use client';

import { Gavel, Undo2, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import { ArtworkImage } from '@/components/artwork-image';
import { StatusPill } from '@/components/status-pill';
import { Button, ButtonLink } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, LoadingState, Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { useAuctionChannel } from '@/hooks/use-auction-channel';
import { useRemaining } from '@/hooks/use-remaining';
import { ApiError, artApi, publicWsUrl } from '@/lib/api/client';
import type { Auction, Lot, WalletSnapshot } from '@/lib/api/types';
import { canWithdraw, formatArtacoins } from '@/lib/auction/policy';
import { bidderLabels, mergeBid, nextMinimumBid, quickBids, roomPhase, type RoomPhase } from '@/lib/auction/room';
import { clockOffset } from '@/lib/clock';
import { formatRelative } from '@/lib/format';
import { loginHref } from '@/lib/session/next-path';
import { browserSession, type SessionSnapshot } from '@/lib/session/browser-session';
import type { AuctionInbound } from '@/lib/ws/events';

/** Mientras la sala abre o cierra, se vuelve a pedir su estado cada tanto. */
const TRANSITION_POLL_MS = 4000;

const onlyDigits = (raw: string) => raw.replace(/\D+/g, '').slice(0, 9);

export function LiveRoom({ auctionId }: { auctionId: string }) {
  const notify = useToast();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
  const [connected, setConnected] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [session, setSession] = useState<SessionSnapshot>(browserSession.current());

  useEffect(() => browserSession.subscribe(setSession), []);

  // Pulso de un segundo: la fase depende de la hora y debe cambiar sola (de "Abre en" a "Abriendo…").
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => { setTick((tick) => tick + 1); }, 1000);
    return () => { window.clearInterval(timer); };
  }, []);

  const applyEvent = useCallback(
    (message: AuctionInbound) => {
      if (message.type === 'status') {
        setConnected(message.connected);
      }
      if (message.type === 'server-time') {
        setOffsetMs(message.offsetMs);
      }
      if (message.type === 'bid-accepted') {
        const event = message.event;
        setAuction((current) =>
          current
            ? {
                ...current,
                currentPrice: event.amount,
                endsAt: event.endsAt,
                bids: mergeBid(current.bids ?? [], { id: event.bidId, bidderId: event.bidderId, amount: event.amount, createdAt: event.serverTime, active: true }),
              }
            : current,
        );
        if (event.extended) {
          notify('Puja en el último momento: el cierre se alargó 30 segundos.', 'info');
        }
      }
      if (message.type === 'auction-closed') {
        setAuction((current) => (current ? { ...current, status: 'CERRADA', currentPrice: message.event.amount, winnerId: message.event.winnerId } : current));
      }
    },
    [notify],
  );
  const { send } = useAuctionChannel(applyEvent);

  const load = useCallback(async () => {
    try {
      const view = await artApi.auction(auctionId);
      setAuction(view.auction);
      setOffsetMs(clockOffset(view.serverTime));
      return view.auction;
    } catch {
      setLoadError('Esta sala no existe o ya no está disponible.');
      return null;
    }
  }, [auctionId]);

  useEffect(() => {
    void load().then((loaded) => {
      if (loaded) {
        void artApi.lot(loaded.lotId).then(setLot).catch(() => undefined);
      }
    });
  }, [load]);

  // Con sesion: se une al canal en vivo con su token y trae su bolsillo.
  useEffect(() => {
    if (session.status !== 'authenticated') {
      return;
    }
    void browserSession.accessToken().then((token) => {
      if (!token) {
        return;
      }
      void artApi.wallet(token).then(setWallet).catch(() => undefined);
      send({ version: 1, type: 'join', auctionId, token, wsUrl: publicWsUrl() });
    });
  }, [auctionId, send, session.status]);

  const phase: RoomPhase | null = auction ? roomPhase(auction, Date.now() + offsetMs) : null;

  // La apertura y el cierre los hace el programador del servidor: se consulta hasta verlos.
  useEffect(() => {
    if (phase !== 'opening' && phase !== 'closing') {
      return;
    }
    const timer = window.setInterval(() => void load(), TRANSITION_POLL_MS);
    return () => { window.clearInterval(timer); };
  }, [phase, load]);

  const minimum = auction ? nextMinimumBid(auction) : 0;

  // La oferta propuesta sigue a la minima mientras la persona no escriba otra mayor.
  useEffect(() => {
    setAmount((current) => (Number(current) >= minimum ? current : String(minimum)));
  }, [minimum]);

  async function refreshWallet(token: string) {
    setWallet(await artApi.wallet(token).catch(() => null));
  }

  async function onBid(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (Number(amount) < minimum) {
      setError(`La oferta mínima es ${formatArtacoins(minimum)}.`);
      return;
    }
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    setPending(true);
    try {
      const placed = await artApi.placeBid(token, auctionId, amount, crypto.randomUUID());
      setAuction((current) =>
        current
          ? {
              ...current,
              currentPrice: placed.currentPrice,
              endsAt: placed.endsAt,
              bids: mergeBid(current.bids ?? [], { id: placed.bidId, bidderId: session.profile?.userId ?? '', amount: placed.amount, createdAt: new Date(Date.now() + offsetMs).toISOString(), active: true }),
            }
          : current,
      );
      notify(placed.extended ? 'Oferta aceptada. El cierre se alargó 30 segundos.' : `Oferta aceptada: vas ganando con ${formatArtacoins(placed.amount)}.`, 'success');
      await refreshWallet(token);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'La oferta no entró. Intenta de nuevo.');
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
      notify(`Te retiraste. Volvieron ${formatArtacoins(result.released)} a tu bolsillo.`, 'success');
      await load();
      await refreshWallet(token);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible retirarse.');
    }
  }

  if (loadError) {
    return <EmptyState icon={<Gavel aria-hidden="true" className="h-6 w-6" />} title="Sala no disponible" description={loadError} action={<ButtonLink href="/catalogo">Ver salas en vivo</ButtonLink>} />;
  }
  if (!auction || !phase) {
    return <LoadingState label="Preparando la sala…" />;
  }

  const viewerId = session.profile?.userId ?? null;
  const labels = bidderLabels(auction.bids ?? [], viewerId);
  const history = [...(auction.bids ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const leader = history.find((bid) => bid.active !== false);
  const isSeller = viewerId !== null && viewerId === auction.sellerId;
  const myActiveBid = history.some((bid) => bid.active !== false && bid.bidderId === viewerId);
  const withdrawAllowed = phase === 'live' && myActiveBid && canWithdraw(new Date(Date.now() + offsetMs), new Date(auction.endsAt));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
      <section aria-labelledby="room-title">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-oxide">Sala de subasta</p>
        <h1 id="room-title" className="mt-1 font-serif text-4xl leading-tight md:text-5xl">
          {lot?.title ?? 'La puja'}
        </h1>
        {lot ? (
          <p className="mt-2 text-muted">
            {lot.artistName ?? 'Artista sin atribuir'}
            {lot.creationYear ? ` · ${String(lot.creationYear)}` : ''}
          </p>
        ) : null}
        <div className="mt-6 overflow-hidden rounded-panel border border-line bg-surface p-3 shadow-panel">
          <div className="overflow-hidden rounded-field bg-paper-deep">
            <ArtworkImage src={lot?.images?.[0]?.url ?? null} alt={lot?.title ?? 'Obra en subasta'} featured />
          </div>
        </div>
        {auction.saleDescription ? <p className="mt-6 max-w-prose leading-relaxed">{auction.saleDescription}</p> : null}
        {lot ? (
          <Link href={`/obras/${lot.id}`} className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
            Ver la ficha y el reporte de autenticidad
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
                {connected ? 'En vivo' : 'Conectando…'}
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-sm text-muted">{leader ? 'Oferta más alta' : 'Precio de salida'}</p>
          <p className="font-serif text-5xl tabular-nums">{formatArtacoins(auction.currentPrice)}</p>
          {leader ? <p className="mt-1 text-sm text-muted">La lleva {labels.get(leader.bidderId) === 'Tú' ? 'tu oferta' : labels.get(leader.bidderId)}</p> : null}
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
          {error ? <Notice tone="error" className="mt-4">{error}</Notice> : null}
          {withdrawAllowed ? (
            <Button variant="ghost" className="mt-3" icon={<Undo2 aria-hidden="true" className="h-4 w-4" />} onClick={() => { setConfirmWithdraw(true); }}>
              Retirar mi oferta
            </Button>
          ) : null}
        </Panel>

        <Panel>
          <h2 className="font-serif text-xl">Historial de pujas</h2>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Aún no hay pujas. La primera oferta abre en {formatArtacoins(minimum)}.</p>
          ) : (
            <ol className="mt-3 divide-y divide-line text-sm">
              {history.slice(0, 12).map((bid) => (
                <li key={bid.id} className={`flex items-baseline justify-between gap-3 py-2 ${bid.active === false ? 'text-muted line-through' : ''}`}>
                  <span className={labels.get(bid.bidderId) === 'Tú' ? 'font-medium' : ''}>{labels.get(bid.bidderId)}</span>
                  <span className="tabular-nums">{formatArtacoins(bid.amount)}</span>
                  <time dateTime={bid.createdAt} className="w-24 text-right text-xs text-muted">
                    {formatRelative(bid.createdAt, new Date(Date.now() + offsetMs))}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmWithdraw}
        title="¿Retirar tu oferta?"
        confirmLabel="Retirarme"
        tone="danger"
        onCancel={() => { setConfirmWithdraw(false); }}
        onConfirm={() => void onWithdraw()}
      >
        Las artacoins retenidas vuelven a tu bolsillo y dejas de competir por esta obra. Solo se puede hasta 4 minutos antes del cierre.
      </ConfirmDialog>
    </div>
  );
}

/** Reloj de la sala: cuanto falta para abrir o cerrar, o el resultado si ya cerro. */
function PhaseClock({ auction, phase, offsetMs, viewerId }: { auction: Auction; phase: RoomPhase; offsetMs: number; viewerId: string | null }) {
  const target = phase === 'upcoming' ? (auction.startsAt ?? auction.endsAt) : auction.endsAt;
  const { label } = useRemaining(target, offsetMs);
  if (phase === 'closed') {
    const text = auction.winnerId === null ? 'Cerró sin ventas: se programará otra fecha.' : auction.winnerId === viewerId ? '¡Ganaste esta obra! Ya está en tu galería.' : 'Cerró con un ganador.';
    return <Notice tone={auction.winnerId === viewerId ? 'success' : 'info'} className="mt-4">{text}</Notice>;
  }
  if (phase === 'opening' || phase === 'closing') {
    return (
      <p className="mt-4 text-sm text-muted" role="status">
        {phase === 'opening' ? 'Abriendo la sala…' : 'Cerrando la sala…'}
      </p>
    );
  }
  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-sm text-muted">{phase === 'upcoming' ? 'Abre en' : 'Cierra en'}</p>
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
  if (session.status !== 'authenticated') {
    return (
      <div>
        <h2 className="font-serif text-xl">¿Quieres pujar?</h2>
        <p className="mt-1 text-sm text-muted">Entra con tu cuenta y recarga artacoins en el bolsillo.</p>
        <ButtonLink href={loginHref(`/subasta/${auctionId}`)} className="mt-4 w-full">
          Entrar para pujar
        </ButtonLink>
      </div>
    );
  }
  if (isSeller) {
    return <Notice>Es tu obra: puedes seguir la sala, pero no ofertar en ella.</Notice>;
  }
  if (phase !== 'live') {
    return (
      <p className="text-sm text-muted">
        {phase === 'upcoming' || phase === 'opening' ? 'Podrás ofertar cuando la sala abra.' : 'La sala ya no recibe ofertas.'}
      </p>
    );
  }
  const balance = wallet?.balance ?? null;
  const short = balance !== null && Number(amount) > balance;
  return (
    <form noValidate onSubmit={onSubmit}>
      <TextField
        id="bid-amount"
        label="Tu oferta en artacoins"
        inputMode="numeric"
        value={amount}
        format={onlyDigits}
        onValueChange={onAmount}
        hint={`Mínimo ${formatArtacoins(minimum)}.`}
      />
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Ofertas rápidas">
        {quickBids(minimum, increment).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => { onAmount(String(value)); }}
            aria-pressed={Number(amount) === value}
            className={`rounded-full border px-3 py-1 text-sm tabular-nums ${Number(amount) === value ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink'}`}
          >
            {value.toLocaleString('es-CO')}
          </button>
        ))}
      </div>
      {balance !== null ? (
        <p className={`mt-3 text-sm ${short ? 'text-oxide' : 'text-muted'}`}>
          Disponible: {formatArtacoins(balance)}.{' '}
          {short ? (
            <Link href="/bolsillo" className="font-medium underline underline-offset-4">
              Recargar
            </Link>
          ) : (
            'Solo se retiene lo que sube tu oferta.'
          )}
        </p>
      ) : null}
      <Button type="submit" variant="accent" loading={pending} className="mt-4 w-full" icon={<Gavel aria-hidden="true" className="h-4 w-4" />}>
        Ofertar {amount ? formatArtacoins(Number(amount)) : ''}
      </Button>
    </form>
  );
}
