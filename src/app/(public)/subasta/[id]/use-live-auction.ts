'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useAuctionChannel } from '@/hooks/use-auction-channel';
import { artApi, publicWsUrl } from '@/lib/api/client';
import type { Auction, Lot, WalletSnapshot } from '@/lib/api/types';
import { mergeBid, roomPhase, type RoomPhase } from '@/lib/auction/room';
import { clockOffset } from '@/lib/clock';
import { browserSession, type SessionSnapshot } from '@/lib/session/browser-session';
import { walletBalance } from '@/lib/session/wallet-balance';
import type { AuctionInbound } from '@/lib/ws/events';

/** Mientras la sala abre o cierra, se vuelve a pedir su estado cada tanto. */
const TRANSITION_POLL_MS = 4000;

/**
 * Estado vivo de una sala de subasta: la carga, la mantiene al dia con los
 * avisos del canal en vivo (puja aceptada, sala cerrada) y, mientras abre o
 * cierra, la vuelve a pedir hasta ver el cambio. Con sesion se une al canal
 * con su token y trae el bolsillo. La fase se recalcula cada segundo con el
 * reloj del servidor. Las acciones (pujar, retirarse, comprar) quedan en la
 * pantalla, que actualiza la sala con updateAuction.
 */
export function useLiveAuction(auctionId: string) {
  const t = useTranslations('Room');
  const locale = useLocale();
  const notify = useToast();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [offsetMs, setOffsetMs] = useState(0);
  const [connected, setConnected] = useState(false);
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
          notify(t('extendedByOther'), 'info');
        }
      }
      if (message.type === 'auction-closed') {
        const event = message.event;
        setAuction((current) =>
          current ? { ...current, status: 'CERRADA', currentPrice: event.amount, winnerId: event.winnerId, closedBy: event.closedBy ?? 'TIME', buyNowAvailable: false } : current,
        );
      }
    },
    [notify, t],
  );
  const { send } = useAuctionChannel(applyEvent);

  const reload = useCallback(async () => {
    try {
      const view = await artApi.auction(auctionId);
      setAuction(view.auction);
      setOffsetMs(clockOffset(view.serverTime));
      return view.auction;
    } catch {
      setLoadError(true);
      return null;
    }
  }, [auctionId]);

  useEffect(() => {
    void reload().then((loaded) => {
      if (loaded) {
        void artApi.lot(loaded.lotId).then(setLot).catch(() => undefined);
      }
    });
    // La ficha llega en el idioma activo: al cambiarlo se vuelve a pedir.
  }, [reload, locale]);

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

  // Al cerrar se trae la sala completa: el historial incluye la compra inmediata, si la hubo.
  const status = auction?.status;
  useEffect(() => {
    if (status === 'CERRADA') {
      void reload();
    }
  }, [status, reload]);

  // La apertura y el cierre los hace el programador del servidor: se consulta hasta verlos.
  useEffect(() => {
    if (phase !== 'opening' && phase !== 'closing') {
      return;
    }
    const timer = window.setInterval(() => void reload(), TRANSITION_POLL_MS);
    return () => { window.clearInterval(timer); };
  }, [phase, reload]);

  /** Aplica a la sala un cambio que ya confirmo el servidor (una puja propia, una compra). */
  const updateAuction = useCallback((change: (current: Auction) => Auction) => {
    setAuction((current) => (current ? change(current) : current));
  }, []);

  /** Trae el bolsillo y el saldo del encabezado tras pujar, retirarse o comprar. */
  const refreshWallet = useCallback(async (token: string) => {
    setWallet(await artApi.wallet(token).catch(() => null));
    void walletBalance.refresh();
  }, []);

  return { auction, lot, loadError, offsetMs, connected, wallet, session, phase, reload, updateAuction, refreshWallet };
}
