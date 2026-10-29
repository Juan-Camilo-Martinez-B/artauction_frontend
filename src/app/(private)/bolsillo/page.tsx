'use client';

import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Field, FormError } from '@/components/field';
import { ApiError, artApi } from '@/lib/api/client';
import type { WalletSnapshot } from '@/lib/api/types';
import { formatArtacoins } from '@/lib/auction/policy';
import { browserSession } from '@/lib/session/browser-session';

const PACKS = [100, 250, 500, 1000];

const entryLabel: Record<string, string> = {
  RECARGA: 'Recarga',
  RETENCION: 'Retención',
  LIBERACION: 'Devolución',
  CANJE: 'Canje por obra',
  VENTA: 'Venta de obra',
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [coins, setCoins] = useState(250);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('2030');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Clave del intento de pago en curso: se reutiliza al reintentar con los mismos
  // datos (no hay doble cobro) y se descarta si cambia algun dato o el cobro sale bien.
  const attemptKey = useRef<string | null>(null);

  useEffect(() => {
    attemptKey.current = null;
  }, [coins, cardNumber, cardName, expMonth, expYear, cvv]);

  useEffect(() => {
    void browserSession.accessToken().then(async (token) => {
      if (!token) {
        setError('Entra para ver tu bolsillo.');
        return;
      }
      try {
        setWallet(await artApi.wallet(token));
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'No se pudo abrir el bolsillo.');
      }
    });
  }, []);

  async function onPay(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const token = await browserSession.accessToken();
    if (!token) {
      setError('Entra para cargar artacoins.');
      return;
    }
    setPending(true);
    attemptKey.current ??= crypto.randomUUID();
    try {
      const result = await artApi.topUp(token, attemptKey.current, {
        coins,
        cardNumber,
        cardName,
        expMonth: Number(expMonth),
        expYear: Number(expYear),
        cvv,
      });
      attemptKey.current = null;
      setCvv('');
      setCardNumber('');
      setNotice(`La pasarela aprobó el cobro. Entraron ${String(result.credited)} artacoins. Terminación ${result.last4}.`);
      setWallet(await artApi.wallet(token));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'La pasarela no completó el cobro.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="max-w-xl">
      <h1 className="font-serif text-4xl">Bolsillo</h1>
      <p className="mt-3 text-muted">
        Las artacoins son la banca de la sala. El cobro es simulado: usa una tarjeta inventada. El número 4242 4242 4242 4242 acredita; el 4000 0000 0000 0002 se rechaza.
      </p>
      {wallet ? (
        <dl className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-muted">Disponible</dt>
            <dd className="font-serif text-3xl">{formatArtacoins(wallet.balance)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Retenido en salas</dt>
            <dd className="font-serif text-3xl">{formatArtacoins(wallet.held)}</dd>
          </div>
        </dl>
      ) : null}
      <form onSubmit={(event) => void onPay(event)} className="mt-8 space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Paquete</legend>
          <div className="flex flex-wrap gap-2">
            {PACKS.map((pack) => (
              <button
                key={pack}
                type="button"
                className={`rounded-full border px-4 py-2 text-sm ${coins === pack ? 'border-ink bg-ink text-paper' : 'border-line'}`}
                onClick={() => { setCoins(pack); }}
              >
                {pack}
              </button>
            ))}
          </div>
        </fieldset>
        <Field id="card-name" label="Nombre en la tarjeta" value={cardName} autoComplete="cc-name" onChange={(event) => { setCardName(event.target.value); }} required minLength={3} />
        <Field id="card-number" label="Número" value={cardNumber} inputMode="numeric" autoComplete="cc-number" onChange={(event) => { setCardNumber(event.target.value); }} required minLength={12} />
        <div className="grid grid-cols-3 gap-3">
          <Field id="card-month" label="Mes" value={expMonth} inputMode="numeric" autoComplete="cc-exp-month" onChange={(event) => { setExpMonth(event.target.value); }} required />
          <Field id="card-year" label="Año" value={expYear} inputMode="numeric" autoComplete="cc-exp-year" onChange={(event) => { setExpYear(event.target.value); }} required />
          <Field id="card-cvv" label="Código" value={cvv} inputMode="numeric" autoComplete="cc-csc" onChange={(event) => { setCvv(event.target.value); }} required minLength={3} maxLength={4} />
        </div>
        <p className="text-sm text-muted">Cobro simulado: {coins}.00 USD por {coins} artacoins. No se guarda el número ni el código.</p>
        <button type="submit" disabled={pending} className="rounded-full bg-oxide px-5 py-2 text-white disabled:opacity-60">
          {pending ? 'Cobrando…' : 'Cargar artacoins'}
        </button>
        {notice ? <p role="status">{notice}</p> : null}
        {error ? <FormError>{error}</FormError> : null}
      </form>
      {wallet && wallet.entries.length > 0 ? (
        <ul className="mt-10 divide-y divide-line">
          {wallet.entries.map((entry) => (
            <li key={entry.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
              <span>{entryLabel[entry.kind] ?? entry.kind}</span>
              <span>{formatArtacoins(entry.coins)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
