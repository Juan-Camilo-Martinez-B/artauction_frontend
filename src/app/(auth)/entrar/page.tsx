'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { PasswordField, TextField } from '@/components/ui/text-field';
import { useFormValidation } from '@/hooks/use-form-validation';
import { ApiError, artApi } from '@/lib/api/client';
import { validateLogin } from '@/lib/forms/validators';
import { browserSession } from '@/lib/session/browser-session';
import { safeNextPath } from '@/lib/session/next-path';

/** Pagina a la que volver: la que pidio entrar (?next=) o el catalogo. */
function destination(): string {
  return safeNextPath(new URLSearchParams(window.location.search).get('next')) ?? '/catalogo';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { touch, visibleError, attemptSubmit } = useFormValidation(validateLogin({ email, password }));

  useEffect(() => {
    void browserSession.restore().then(() => {
      if (browserSession.current().status === 'authenticated') {
        router.replace(destination());
      }
    });
  }, [router]);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!attemptSubmit()) {
      return;
    }
    setPending(true);
    try {
      const tokens = await artApi.login(email.trim(), password);
      await browserSession.establish(tokens);
      router.push(destination());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo entrar. Intenta de nuevo.');
      setPending(false);
    }
  }

  return (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-oxide">Tu cuenta</p>
      <h1 className="mt-1 font-serif text-4xl">Entrar</h1>
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
        <TextField
          id="email"
          label="Correo"
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
          label="Contraseña"
          autoComplete="current-password"
          required
          value={password}
          onValueChange={setPassword}
          onBlur={() => { touch('password'); }}
          error={visibleError('password')}
        />
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button type="submit" loading={pending} className="w-full">
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
        ¿Aún no tienes cuenta?{' '}
        <Link href="/registro" className="font-medium text-ink underline underline-offset-4">
          Crear cuenta
        </Link>
      </p>
    </>
  );
}
