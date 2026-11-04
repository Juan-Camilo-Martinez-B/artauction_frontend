'use client';

import { Coins } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { browserSession, type SessionSnapshot } from '@/lib/session/browser-session';
import { walletBalance, type BalanceSnapshot } from '@/lib/session/wallet-balance';

/** Cada cuanto se vuelve a pedir el saldo mientras la pestana esta abierta. */
const REFRESH_MS = 60_000;

const compact = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** Saldo de artacoins en el encabezado; lleva al bolsillo. Solo con sesion. */
export function BalanceBadge() {
  const [session, setSession] = useState<SessionSnapshot>(browserSession.current());
  const [snapshot, setSnapshot] = useState<BalanceSnapshot | null>(walletBalance.current());

  useEffect(() => browserSession.subscribe(setSession), []);
  useEffect(() => walletBalance.subscribe(setSnapshot), []);

  useEffect(() => {
    if (session.status !== 'authenticated') {
      walletBalance.clear();
      return;
    }
    void walletBalance.refresh();
    // Las ventas y devoluciones llegan por eventos: se refresca al volver a la pestana y cada minuto.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void walletBalance.refresh();
      }
    };
    const timer = window.setInterval(onVisible, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [session.status, session.profile?.userId]);

  if (session.status !== 'authenticated' || snapshot === null) {
    return null;
  }
  const held = snapshot.held > 0 ? ` y ${compact.format(snapshot.held)} retenidas en pujas` : '';
  return (
    <Link
      href="/bolsillo"
      title={`Saldo disponible: ${compact.format(snapshot.balance)} artacoins${held}. Abre tu bolsillo.`}
      aria-label={`Saldo: ${compact.format(snapshot.balance)} artacoins${held}. Abrir bolsillo`}
      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium tabular-nums transition-colors hover:border-ink"
    >
      <Coins aria-hidden="true" className="h-4 w-4 text-ochre" />
      {compact.format(snapshot.balance)}
      <span className="hidden text-xs font-normal text-muted sm:inline">AC</span>
    </Link>
  );
}
