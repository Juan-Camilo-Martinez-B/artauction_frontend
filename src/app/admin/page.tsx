'use client';

import { useState, type SubmitEvent } from 'react';
import { Field, FormError } from '@/components/field';
import { ApiError, artApi } from '@/lib/api/client';
import { readAccessToken } from '@/lib/session';

export default function AdminPage() {
  const [lotId, setLotId] = useState('');
  const [verdict, setVerdict] = useState<'APROBADO' | 'BORRADOR'>('APROBADO');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const token = readAccessToken();
    if (!token) {
      setError('Hace falta una sesión de administración.');
      return;
    }
    try {
      const lot = await artApi.resolveLot(token, lotId, verdict);
      setMessage(`${lot.title} quedó en ${lot.status}.`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo resolver la obra.');
    }
  }

  return (
    <section className="mx-auto max-w-lg">
      <h1 className="font-serif text-4xl">Revisión manual</h1>
      <p className="mt-2 text-sm text-muted">Solo una cuenta administradora puede mover una obra fuera de revisión.</p>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
        <Field id="lot" label="Identificador de la obra" required value={lotId} onChange={(event) => {
          setLotId(event.target.value);
        }} />
        <label className="block text-sm" htmlFor="verdict">
          Decisión
          <select
            id="verdict"
            value={verdict}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'APROBADO' || value === 'BORRADOR') {
                setVerdict(value);
              }
            }}
            className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
          >
            <option value="APROBADO">Aprobar y publicar</option>
            <option value="BORRADOR">Devolver a borrador</option>
          </select>
        </label>
        {error ? <FormError>{error}</FormError> : null}
        {message ? <p role="status">{message}</p> : null}
        <button type="submit" className="rounded-full bg-ink px-5 py-2 text-paper">
          Resolver
        </button>
      </form>
    </section>
  );
}
