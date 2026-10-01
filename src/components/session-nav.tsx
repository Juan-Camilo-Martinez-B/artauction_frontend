'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, artApi } from '@/lib/api/client';
import { clearAccessToken, readAccessToken } from '@/lib/session';

export function SessionNav() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const token = readAccessToken();
    if (!token) {
      return;
    }
    void artApi
      .me(token)
      .then((user) => {
        setLabel(user.role === 'ADMIN' ? 'Revisión' : 'Perfil');
      })
      .catch((caught: unknown) => {
        if (caught instanceof ApiError && caught.status === 401) {
          clearAccessToken();
        }
      });
  }, []);

  if (!label) {
    return (
      <Link href="/entrar" className="rounded-full bg-ink px-3 py-1.5 text-paper">
        Entrar
      </Link>
    );
  }

  return (
    <Link href={label === 'Revisión' ? '/admin' : '/perfil'} className="rounded-full bg-ink px-3 py-1.5 text-paper">
      {label}
    </Link>
  );
}
