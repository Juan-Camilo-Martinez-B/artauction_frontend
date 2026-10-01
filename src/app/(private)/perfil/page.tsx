'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { artApi } from '@/lib/api/client';
import { clearAccessToken, readAccessToken } from '@/lib/session';
import type { AuthUser } from '@/lib/api/types';

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = readAccessToken();
    if (!token) {
      setError('Entra para ver tu perfil.');
      return;
    }
    void artApi
      .me(token)
      .then(setUser)
      .catch(() => {
        clearAccessToken();
        setError('La sesión no es válida.');
      });
  }, []);

  async function logout() {
    clearAccessToken();
    await fetch('/api/session', { method: 'DELETE' });
    setUser(null);
  }

  return (
    <section>
      <h1 className="font-serif text-4xl">Tu perfil</h1>
      {error ? <p className="mt-4">{error}</p> : null}
      {user ? (
        <div className="mt-6 space-y-3">
          <p>{user.email}</p>
          <p className="text-sm text-muted">Rol {user.role}</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/galeria">Galería</Link>
            <Link href="/feed">Actividad</Link>
            <Link href="/notificaciones">Avisos</Link>
            {user.role === 'SELLER' || user.role === 'ADMIN' ? <Link href="/publicar">Publicar</Link> : null}
          </div>
          <button type="button" onClick={() => void logout()} className="rounded-full border border-line px-4 py-2">
            Salir
          </button>
        </div>
      ) : null}
    </section>
  );
}
