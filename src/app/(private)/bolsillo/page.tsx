'use client';

import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { CardPreview } from '@/components/payments/card-preview';
import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState, PageHeader, Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { useFormValidation } from '@/hooks/use-form-validation';
import { ApiError, artApi } from '@/lib/api/client';
import type { WalletEntry, WalletSnapshot } from '@/lib/api/types';
import { formatArtacoins } from '@/lib/auction/policy';
import {
  BRANDS,
  cardNameError,
  cardNumberError,
  cvvError,
  detectBrand,
  expiryError,
  formatCardName,
  formatCardNumber,
  formatCvv,
  formatExpiry,
  onlyDigits,
  parseExpiry,
} from '@/lib/payments/card';
import { browserSession } from '@/lib/session/browser-session';

const PACKS = [100, 250, 500, 1000];

const entryLabel: Record<WalletEntry['kind'], string> = {
  RECARGA: 'Recarga',
  RETENCION: 'Retenido en una sala',
  LIBERACION: 'Devolución de una sala',
  CANJE: 'Pago de una obra ganada',
  VENTA: 'Venta de una obra',
};

// Movimientos que suman al saldo disponible; el resto lo descuentan.
const CREDIT_KINDS = new Set<WalletEntry['kind']>(['RECARGA', 'LIBERACION', 'VENTA']);

const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

type WalletState = { status: 'loading' } | { status: 'anonymous' } | { status: 'error'; message: string } | { status: 'ready'; wallet: WalletSnapshot };

export default function WalletPage() {
  const notify = useToast();
  const [state, setState] = useState<WalletState>({ status: 'loading' });
  const [coins, setCoins] = useState(250);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Clave del intento de pago en curso: se reutiliza al reintentar con los mismos
  // datos (no hay doble cobro) y se descarta si cambia algun dato o el cobro sale bien.
  const attemptKey = useRef<string | null>(null);

  const brand = detectBrand(onlyDigits(cardNumber));
  const { touch, visibleError, attemptSubmit, reset } = useFormValidation({
    cardName: cardNameError(cardName),
    cardNumber: cardNumberError(cardNumber),
    expiry: expiryError(expiry),
    cvv: cvvError(cvv, brand),
  });

  useEffect(() => {
    attemptKey.current = null;
  }, [coins, cardName, cardNumber, expiry, cvv]);

  useEffect(() => {
    void browserSession.accessToken().then(async (token) => {
      if (!token) {
        setState({ status: 'anonymous' });
        return;
      }
      try {
        setState({ status: 'ready', wallet: await artApi.wallet(token) });
      } catch (caught) {
        setState({ status: 'error', message: caught instanceof ApiError ? caught.message : 'No se pudo abrir el bolsillo.' });
      }
    });
  }, []);

  function onCardNumber(value: string) {
    setCardNumber(value);
    // Si la marca cambia (por ejemplo, a American Express), el CVV se ajusta a su largo.
    setCvv((current) => formatCvv(current, detectBrand(onlyDigits(value))));
  }

  async function onPay(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const expiryParts = parseExpiry(expiry);
    if (!attemptSubmit() || !expiryParts) {
      return;
    }
    const token = await browserSession.accessToken();
    if (!token) {
      setState({ status: 'anonymous' });
      return;
    }
    setPending(true);
    attemptKey.current ??= crypto.randomUUID();
    try {
      const result = await artApi.topUp(token, attemptKey.current, {
        coins,
        cardNumber: onlyDigits(cardNumber),
        cardName: cardName.trim(),
        expMonth: expiryParts.month,
        expYear: expiryParts.year,
        cvv,
      });
      attemptKey.current = null;
      setCvv('');
      reset();
      notify(`Entraron ${formatArtacoins(result.credited)} con la tarjeta terminada en ${result.last4}.`, 'success');
      setState({ status: 'ready', wallet: await artApi.wallet(token) });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'La pasarela no completó el cobro. Intenta de nuevo.');
    } finally {
      setPending(false);
    }
  }

  if (state.status === 'loading') {
    return <LoadingState label="Abriendo tu bolsillo…" />;
  }
  if (state.status === 'anonymous') {
    return (
      <EmptyState
        title="Entra para ver tu bolsillo"
        description="Tus artacoins, lo retenido en salas y tus recargas viven en tu cuenta."
        action={<ButtonLink href="/entrar">Entrar</ButtonLink>}
      />
    );
  }
  if (state.status === 'error') {
    return <Notice tone="error">{state.message}</Notice>;
  }

  const { wallet } = state;
  return (
    <>
      <PageHeader
        eyebrow="Artacoins"
        title="Bolsillo"
        description="Las artacoins son la moneda de la sala. El cobro es simulado: sirve cualquier tarjeta inventada que no esté vencida."
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel as="section">
          <h2 className="font-serif text-2xl">Recargar</h2>
          <form noValidate onSubmit={(event) => void onPay(event)} className="mt-5 space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Paquete</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PACKS.map((pack) => (
                  <label
                    key={pack}
                    className="cursor-pointer rounded-field border border-line-strong bg-surface px-3 py-3 text-center transition-colors hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-oxide"
                  >
                    <input type="radio" name="pack" value={pack} checked={coins === pack} onChange={() => { setCoins(pack); }} className="sr-only" />
                    <span className="block font-serif text-2xl">{pack}</span>
                    <span className="block text-xs opacity-80">{pack}.00 USD</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="space-y-4">
                <TextField
                  id="card-name"
                  label="Nombre en la tarjeta"
                  autoComplete="cc-name"
                  required
                  value={cardName}
                  format={formatCardName}
                  onValueChange={setCardName}
                  onBlur={() => { touch('cardName'); }}
                  error={visibleError('cardName')}
                />
                <TextField
                  id="card-number"
                  label="Número de la tarjeta"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  required
                  value={cardNumber}
                  format={formatCardNumber}
                  onValueChange={onCardNumber}
                  onBlur={() => { touch('cardNumber'); }}
                  error={visibleError('cardNumber')}
                  hint="Visa, Mastercard, American Express o Diners Club."
                  trailing={cardNumber ? <span className="px-2 text-xs font-medium text-muted">{BRANDS[brand].label}</span> : null}
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    id="card-expiry"
                    label="Vencimiento"
                    placeholder="MM/AA"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    required
                    value={expiry}
                    format={formatExpiry}
                    onValueChange={setExpiry}
                    onBlur={() => { touch('expiry'); }}
                    error={visibleError('expiry')}
                  />
                  <TextField
                    id="card-cvv"
                    label="Código de seguridad"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    required
                    value={cvv}
                    format={(raw) => formatCvv(raw, brand)}
                    onValueChange={setCvv}
                    onBlur={() => { touch('cvv'); }}
                    error={visibleError('cvv')}
                    hint={`${String(BRANDS[brand].cvvDigits)} dígitos, al ${brand === 'amex' ? 'frente' : 'respaldo'}.`}
                  />
                </div>
              </div>
              <div className="hidden w-72 md:block">
                <CardPreview brand={brand} number={cardNumber} name={cardName} expiry={expiry} />
              </div>
            </div>
            {error ? <Notice tone="error">{error}</Notice> : null}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <p className="text-sm text-muted">No se guarda el número ni el código.</p>
              <Button type="submit" variant="accent" loading={pending}>
                {pending ? 'Cobrando…' : `Pagar ${String(coins)}.00 USD`}
              </Button>
            </div>
          </form>
        </Panel>
        <aside className="space-y-6">
          <Panel>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted">Disponible</dt>
                <dd className="font-serif text-4xl">{formatArtacoins(wallet.balance)}</dd>
              </div>
              <div className="border-t border-line pt-4">
                <dt className="text-sm text-muted">Retenido en salas</dt>
                <dd className="font-serif text-2xl">{formatArtacoins(wallet.held)}</dd>
              </div>
            </dl>
          </Panel>
          <Panel>
            <h2 className="font-serif text-xl">Movimientos</h2>
            {wallet.entries.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aún no hay movimientos. Tu primera recarga aparecerá aquí.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {wallet.entries.map((entry) => {
                  const credit = CREDIT_KINDS.has(entry.kind);
                  return (
                    <li key={entry.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                      <span>
                        <span className="block">{entryLabel[entry.kind]}</span>
                        <span className="text-xs text-muted">{dateFormat.format(new Date(entry.createdAt))}</span>
                      </span>
                      <span className={`shrink-0 font-medium ${credit ? 'text-moss' : 'text-ink'}`}>
                        {credit ? '+' : '−'}
                        {formatArtacoins(Math.abs(entry.coins))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
