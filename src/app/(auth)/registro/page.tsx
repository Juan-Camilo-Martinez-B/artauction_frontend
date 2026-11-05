'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { PasswordField, TextField } from '@/components/ui/text-field';
import { useAccountErrors } from '@/hooks/use-account-errors';
import { useErrorText } from '@/hooks/use-error-text';
import { useFormValidation } from '@/hooks/use-form-validation';
import { artApi } from '@/lib/api/client';
import { MIN_PASSWORD, validateRegistration } from '@/lib/forms/validators';
import { browserSession } from '@/lib/session/browser-session';

export default function RegisterPage() {
  const t = useTranslations('Auth');
  const accountErrors = useAccountErrors();
  const errorText = useErrorText();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [seller, setSeller] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { touch, visibleError, attemptSubmit } = useFormValidation(accountErrors(validateRegistration({ displayName, email, password })));

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!attemptSubmit()) {
      return;
    }
    setPending(true);
    try {
      const cleanEmail = email.trim();
      await artApi.register({
        email: cleanEmail,
        password,
        displayName: displayName.trim(),
        role: seller ? 'SELLER' : 'USER',
      });
      const tokens = await artApi.login(cleanEmail, password);
      await browserSession.establish(tokens);
      router.push(seller ? '/publicar' : '/catalogo');
    } catch (caught) {
      setError(errorText(caught, t('registerFailed')));
      setPending(false);
    }
  }

  return (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-oxide">{t('registerEyebrow')}</p>
      <h1 className="mt-1 font-serif text-4xl">{t('createAccount')}</h1>
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
        <TextField
          id="name"
          label={t('name')}
          autoComplete="name"
          required
          maxLength={80}
          value={displayName}
          onValueChange={setDisplayName}
          onBlur={() => { touch('displayName'); }}
          error={visibleError('displayName')}
        />
        <TextField
          id="email"
          label={t('email')}
          type="email"
          autoComplete="email"
          required
          value={email}
          onValueChange={setEmail}
          onBlur={() => { touch('email'); }}
          error={visibleError('email')}
        />
        <PasswordField
          id="password"
          label={t('password')}
          autoComplete="new-password"
          required
          maxLength={256}
          hint={t('passwordHint', { min: MIN_PASSWORD })}
          value={password}
          onValueChange={setPassword}
          onBlur={() => { touch('password'); }}
          error={visibleError('password')}
        />
        <label className="flex items-start gap-3 rounded-field border border-line bg-paper px-3 py-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-oxide"
            checked={seller}
            onChange={(event) => { setSeller(event.target.checked); }}
          />
          <span>
            <span className="block font-medium">{t('sellerTitle')}</span>
            <span className="text-muted">{t('sellerHint')}</span>
          </span>
        </label>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button type="submit" variant="accent" loading={pending} className="w-full">
          {pending ? t('creatingAccount') : t('createAccount')}
        </Button>
      </form>
      <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
        {t('haveAccount')}{' '}
        <Link href="/entrar" className="font-medium text-ink underline underline-offset-4">
          {t('loginTitle')}
        </Link>
      </p>
    </>
  );
}
