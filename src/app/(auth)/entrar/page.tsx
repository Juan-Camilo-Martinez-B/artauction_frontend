'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type SubmitEvent } from 'react';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/ui/text-field';
import { ApiError, artApi } from '@/lib/api/client';
import { browserSession } from '@/lib/session/browser-session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void browserSession.restore().then(() => {
      if (browserSession.current().status === 'authenticated') {
        router.replace('/catalogo');
      }
    });
  }, [router]);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const tokens = await artApi.login(email, password);
      await browserSession.establish(tokens);
      router.push('/catalogo');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo entrar.');
    }
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="font-serif text-4xl">Entrar</h1>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
        <TextField id="email" label="Correo" type="email" autoComplete="email" required value={email} onValueChange={setEmail} />
        <TextField id="password" label="Contraseña" type="password" autoComplete="current-password" required minLength={10} value={password} onValueChange={setPassword} />
        {error ? <Notice tone="error">{error}</Notice> : null}
        <button type="submit" className="rounded-full bg-ink px-5 py-2 text-paper">
          Entrar
        </button>
      </form>
      <p className="mt-4 text-sm">
        <Link href="/registro">Crear cuenta</Link>
      </p>
    </section>
  );
}
