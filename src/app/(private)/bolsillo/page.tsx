'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { CardPreview } from '@/components/payments/card-preview';
import { RequireSession } from '@/components/session/require-session';
import { Button } from '@/components/ui/button';
import { LoadingState, PageHeader, Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { useErrorText } from '@/hooks/use-error-text';
import { useFormat } from '@/hooks/use-format';
import { useFormValidation } from '@/hooks/use-form-validation';
import { artApi } from '@/lib/api/client';
import type { WalletEntry, WalletSnapshot } from '@/lib/api/types';
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
  type CardBrand,
  type CardProblem,
} from '@/lib/payments/card';
import { browserSession } from '@/lib/session/browser-session';
import { walletBalance } from '@/lib/session/wallet-balance';

const PACKS = [100, 250, 500, 1000];

// Movimientos que suman al saldo disponible; el resto lo descuentan.
const CREDIT_KINDS = new Set<WalletEntry['kind']>(['RECARGA', 'LIBERACION', 'VENTA', 'REEMBOLSO']);

type WalletState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; wallet: WalletSnapshot };

/** Texto de un problema de la tarjeta, con la marca o los digitos que correspondan. */
function useCardProblem(brand: CardBrand): (problem: CardProblem | undefined) => string | undefined {
  const t = useTranslations('Card');
  return (problem) => {
    if (!problem) {
      return undefined;
    }
    if (problem === 'numberLength') {
      return t('numberLength', { brand: BRANDS[brand].label || t('genericBrand'), digits: BRANDS[brand].digits });
    }
    if (problem === 'cvvLength') {
      return t('cvvLength', { digits: BRANDS[brand].cvvDigits });
    }
    return t(problem);
  };
}

export default function WalletPage() {
  const t = useTranslations('Wallet');
  return <RequireSession title={t('signInTitle')}>{() => <Wallet />}</RequireSession>;
}

function Wallet() {
  const t = useTranslations('Wallet');
  const tCard = useTranslations('Card');
  const format = useFormat();
  const errorText = useErrorText();
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
  const cardProblem = useCardProblem(brand);
  const { touch, visibleError, attemptSubmit, reset } = useFormValidation({
    cardName: cardProblem(cardNameError(cardName)),
    cardNumber: cardProblem(cardNumberError(cardNumber)),
    expiry: cardProblem(expiryError(expiry)),
    cvv: cardProblem(cvvError(cvv, brand)),
  });

  useEffect(() => {
    attemptKey.current = null;
  }, [coins, cardName, cardNumber, expiry, cvv]);

  useEffect(() => {
    void browserSession.accessToken().then(async (token) => {
      if (!token) {
        return;
      }
      try {
        setState({ status: 'ready', wallet: await artApi.wallet(token) });
      } catch (caught) {
        setState({ status: 'error', message: errorText(caught, t('loadFailed')) });
      }
    });
  }, [errorText, t]);

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
      notify(t('credited', { amount: format.artacoins(result.credited), last4: result.last4 }), 'success');
      setState({ status: 'ready', wallet: await artApi.wallet(token) });
      // El saldo del encabezado sube con la recarga.
      void walletBalance.refresh();
    } catch (caught) {
      setError(errorText(caught, t('payFailed')));
    } finally {
      setPending(false);
    }
  }

  if (state.status === 'loading') {
    return <LoadingState label={t('opening')} />;
  }
  if (state.status === 'error') {
    return <Notice tone="error">{state.message}</Notice>;
  }

  const { wallet } = state;
  return (
    <>
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel as="section">
          <h2 className="font-serif text-2xl">{t('topUp')}</h2>
          <form noValidate onSubmit={(event) => void onPay(event)} className="mt-5 space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t('pack')}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PACKS.map((pack) => (
                  <label
                    key={pack}
                    className="cursor-pointer rounded-field border border-line-strong bg-surface px-3 py-3 text-center transition-colors hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-oxide"
                  >
                    <input type="radio" name="pack" value={pack} checked={coins === pack} onChange={() => { setCoins(pack); }} className="sr-only" />
                    <span className="block font-serif text-2xl">{pack}</span>
                    <span className="block text-xs opacity-80">{format.money(pack)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="space-y-4">
                <TextField
                  id="card-name"
                  label={tCard('nameLabel')}
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
                  label={tCard('numberLabel')}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  required
                  value={cardNumber}
                  format={formatCardNumber}
                  onValueChange={onCardNumber}
                  onBlur={() => { touch('cardNumber'); }}
                  error={visibleError('cardNumber')}
                  hint={tCard('numberHint')}
                  trailing={cardNumber ? <span className="px-2 text-xs font-medium text-muted">{BRANDS[brand].label || tCard('genericBrand')}</span> : null}
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    id="card-expiry"
                    label={tCard('expiryLabel')}
                    placeholder={tCard('expiryPlaceholder')}
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
                    label={tCard('cvvLabel')}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    required
                    value={cvv}
                    format={(raw) => formatCvv(raw, brand)}
                    onValueChange={setCvv}
                    onBlur={() => { touch('cvv'); }}
                    error={visibleError('cvv')}
                    hint={brand === 'amex' ? tCard('cvvHintFront', { digits: BRANDS[brand].cvvDigits }) : tCard('cvvHintBack', { digits: BRANDS[brand].cvvDigits })}
                  />
                </div>
              </div>
              <div className="hidden w-72 md:block">
                <CardPreview brand={brand} number={cardNumber} name={cardName} expiry={expiry} />
              </div>
            </div>
            {error ? <Notice tone="error">{error}</Notice> : null}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <p className="text-sm text-muted">{t('notStored')}</p>
              <Button type="submit" variant="accent" loading={pending}>
                {pending ? t('charging') : t('pay', { amount: format.money(coins) })}
              </Button>
            </div>
          </form>
        </Panel>
        <aside className="space-y-6">
          <Panel>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted">{t('available')}</dt>
                <dd className="font-serif text-4xl">{format.artacoins(wallet.balance)}</dd>
              </div>
              <div className="border-t border-line pt-4">
                <dt className="text-sm text-muted">{t('held')}</dt>
                <dd className="font-serif text-2xl">{format.artacoins(wallet.held)}</dd>
              </div>
            </dl>
          </Panel>
          <Panel>
            <h2 className="font-serif text-xl">{t('entriesTitle')}</h2>
            {wallet.entries.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{t('noEntries')}</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {wallet.entries.map((entry) => {
                  const credit = CREDIT_KINDS.has(entry.kind);
                  return (
                    <li key={entry.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                      <span>
                        <span className="block">{t(`entries.${entry.kind}`)}</span>
                        <span className="text-xs text-muted">{format.dateTime(entry.createdAt)}</span>
                      </span>
                      <span className={`shrink-0 font-medium ${credit ? 'text-moss' : 'text-ink'}`}>
                        {credit ? '+' : '−'}
                        {format.artacoins(Math.abs(entry.coins))}
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
