'use client';

import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { Field, FormError } from '@/components/field';
import { ApiError, artApi } from '@/lib/api/client';
import { writeAccessToken } from '@/lib/session';

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [seller, setSeller] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await artApi.register({
        email,
        password,
        displayName,
        role: seller ? 'SELLER' : 'USER',
      });
      const tokens = await artApi.login(email, password);
      writeAccessToken(tokens.accessToken);
      router.push(seller ? '/publicar' : '/catalogo');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo crear la cuenta.');
    }
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="font-serif text-4xl">Crear cuenta</h1>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
        <Field id="name" label="Nombre" required minLength={2} value={displayName} onChange={(event) => {
          setDisplayName(event.target.value);
        }} />
        <Field id="email" label="Correo" type="email" required value={email} onChange={(event) => {
          setEmail(event.target.value);
        }} />
        <Field id="password" label="Contraseña" type="password" required minLength={10} hint="Mínimo 10 caracteres." value={password} onChange={(event) => {
          setPassword(event.target.value);
        }} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={seller}
            onChange={(event) => {
              setSeller(event.target.checked);
            }}
          />
          Quiero publicar obras
        </label>
        {error ? <FormError>{error}</FormError> : null}
        <button type="submit" className="rounded-full bg-oxide px-5 py-2 text-white">
          Registrarme
        </button>
      </form>
    </section>
  );
}
