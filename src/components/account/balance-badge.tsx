'use client';

import { Coins } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useFormat } from '@/hooks/use-format';
import { browserSession, type SessionSnapshot } from '@/lib/session/browser-session';
import { walletBalance, type BalanceSnapshot } from '@/lib/session/wallet-balance';

/** Cada cuanto se vuelve a pedir el saldo mientras la pestana esta abierta. */
const REFRESH_MS = 60_000;

/** Saldo de artacoins en el encabezado; lleva al bolsillo. Solo con sesion. */
export function BalanceBadge() {
  const t = useTranslations('Balance');
  const format = useFormat();
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
  const balance = format.integer(snapshot.balance);
  const held = snapshot.held > 0 ? t('held', { held: format.integer(snapshot.held) }) : '';
  return (
    <Link
      href="/bolsillo"
      title={t('title', { balance, held })}
      aria-label={t('label', { balance, held })}
      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium tabular-nums transition-colors hover:border-ink"
    >
      <Coins aria-hidden="true" className="h-4 w-4 text-ochre" />
      {balance}
      <span className="hidden text-xs font-normal text-muted sm:inline">{t('unit')}</span>
    </Link>
  );
}
