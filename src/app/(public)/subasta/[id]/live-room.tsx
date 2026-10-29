'use client';

import { useEffect, useState, type SubmitEvent } from 'react';
import { Countdown } from '@/components/countdown';
import { FormError } from '@/components/field';
import { StatusPill } from '@/components/status-pill';
import { useAuctionChannel } from '@/hooks/use-auction-channel';
import { ApiError, artApi, publicWsUrl } from '@/lib/api/client';
import type { Auction, WalletSnapshot } from '@/lib/api/types';
import { canWithdraw, formatArtacoins } from '@/lib/auction/policy';
import { clockOffset } from '@/lib/clock';
import { browserSession } from '@/lib/session/browser-session';
import type { AuctionInbound } from '@/lib/ws/events';

export function LiveRoom({ auctionId }: { auctionId: string }) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
  const [synced, setSynced] = useState(false);
  const [amount, setAmount] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const { send } = useAuctionChannel((message) => {
    applyEvent(message);
  });

  function applyEvent(message: AuctionInbound) {
    if (message.type === 'server-time') {
      setOffsetMs(message.offsetMs);
      setSynced(true);
    }
    if (message.type === 'bid-accepted') {
      setAuction((current) =>
        current
          ? { ...current, currentPrice: message.event.amount, endsAt: message.event.endsAt }
          : current,
      );
      setNotice(message.event.extended ? 'Puja aceptada. El cierre se alargó 30 segundos.' : 'Puja aceptada.');
    }
    if (message.type === 'bid-rejected') {
      setError(message.event.message);
    }
    if (message.type === 'auction-closed') {
      setAuction((current) => (current ? { ...current, status: 'CERRADA', currentPrice: message.event.amount } : current));
      setNotice('La sala cerró.');
    }
  }

  useEffect(() => {
    void artApi
      .auction(auctionId)
      .then((view) => {
        setAuction(view.auction);
        setAmount(String(Math.round(Number(view.auction.currentPrice))));
        setOffsetMs(clockOffset(view.serverTime));
        setSynced(true);
      })
      .catch(() => {
        setError('No se pudo abrir la sala.');
      });
  }, [auctionId]);

  useEffect(() => {
    void browserSession.accessToken().then((token) => {
      if (!token) {
        return;
      }
      void artApi.wallet(token).then(setWallet).catch(() => undefined);
      send({ version: 1, type: 'join', auctionId, token, wsUrl: publicWsUrl() });
    });
  }, [auctionId, send]);

  async function onBid(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const token = await browserSession.accessToken();
    if (!token) {
      setError('Entra para pujar.');
      return;
    }
    const idempotencyKey = crypto.randomUUID();
    send({ version: 1, type: 'bid', auctionId, amount, idempotencyKey });
    try {
      const placed = await artApi.placeBid(token, auctionId, amount, idempotencyKey);
      setAuction((current) =>
        current ? { ...current, currentPrice: placed.currentPrice, endsAt: placed.endsAt } : current,
      );
      setNotice(placed.extended ? 'Oferta aceptada. El cierre se alargó 30 segundos.' : 'Oferta aceptada.');
      setWallet(await artApi.wallet(token));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'La puja no entró.');
    }
  }

  async function onWithdraw() {
    setError(null);
    const token = await browserSession.accessToken();
    if (!token) {
      setError('Entra para retirarte.');
      return;
    }
    try {
      const result = await artApi.withdrawBid(token, auctionId);
      setAuction((current) => (current ? { ...current, currentPrice: result.currentPrice } : current));
      setNotice(`Te retiraste. Volvieron ${String(result.released)} artacoins al bolsillo.`);
      setWallet(await artApi.wallet(token));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No fue posible retirarse.');
    }
  }

  if (!auction) {
    return <p>{error ?? 'Preparando la sala…'}</p>;
  }

  return (
    <div>
      <StatusPill status={auction.status} />
      <p className="mt-4 text-sm text-muted">Precio actual</p>
      <p className="font-serif text-4xl">{formatArtacoins(auction.currentPrice)}</p>
      {wallet ? <p className="mt-2 text-sm text-muted">Disponible {formatArtacoins(wallet.balance)}</p> : null}
      {synced ? <Countdown endsAt={auction.endsAt} offsetMs={offsetMs} /> : <p>Sincronizando el reloj del servidor…</p>}
      <form onSubmit={(event) => void onBid(event)} className="mt-8 flex max-w-md flex-col gap-3">
        <label className="text-sm" htmlFor="bid-amount">
          Tu oferta en artacoins
          <input
            id="bid-amount"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
            }}
            inputMode="numeric"
            className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded-full bg-oxide px-5 py-2 text-white">
          Ofertar
        </button>
        {auction.status === 'ACTIVA' ? (
          <button
            type="button"
            className="rounded-full border border-line px-5 py-2"
            onClick={() => void onWithdraw()}
            disabled={!canWithdraw(new Date(Date.now() + offsetMs), new Date(auction.endsAt))}
          >
            Retirarme
          </button>
        ) : null}
        <p className="text-sm text-muted">
          Cada oferta nueva retiene solo el aumento. Retirarse exige al menos 4 minutos antes del cierre.
        </p>
        {notice ? <p role="status">{notice}</p> : null}
        {error ? <FormError>{error}</FormError> : null}
      </form>
    </div>
  );
}
