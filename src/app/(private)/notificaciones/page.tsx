'use client';

import { useEffect, useState } from 'react';
import { artApi } from '@/lib/api/client';
import { readAccessToken } from '@/lib/session';
import type { NotificationItem } from '@/lib/api/types';

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [message, setMessage] = useState('Cargando avisos…');

  useEffect(() => {
    const token = readAccessToken();
    if (!token) {
      setMessage('Entra para ver tus avisos.');
      return;
    }
    void artApi
      .notifications(token)
      .then((rows) => {
        setItems(rows);
        setMessage(rows.length === 0 ? 'No tienes avisos.' : '');
      })
      .catch(() => {
        setMessage('No se pudieron cargar los avisos.');
      });
  }, []);

  return (
    <section>
      <h1 className="font-serif text-4xl">Avisos</h1>
      {message ? <p className="mt-4">{message}</p> : null}
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={`${item.kind}-${item.createdAt}`} className="rounded-lg border border-line bg-white p-4">
            <p className="font-medium">{item.kind === 'AUDIT' ? 'Auditoría' : 'Subasta cerrada'}</p>
            <p className="text-sm text-muted">{item.payload['verdict'] ?? item.payload['amount'] ?? item.payload['lotId']}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
