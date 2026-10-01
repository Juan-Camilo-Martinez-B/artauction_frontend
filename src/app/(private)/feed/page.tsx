'use client';

import { useEffect, useState } from 'react';
import { artApi } from '@/lib/api/client';
import { readAccessToken } from '@/lib/session';
import type { ActivityItem } from '@/lib/api/types';

export default function FeedPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [message, setMessage] = useState('Cargando actividad…');

  useEffect(() => {
    const token = readAccessToken();
    if (!token) {
      setMessage('Entra para ver la actividad.');
      return;
    }
    void artApi
      .feed(token)
      .then((rows) => {
        setItems(rows.filter((item) => item.visibility === 'PUBLIC' || item.actorId.length > 0));
        setMessage(rows.length === 0 ? 'Todavía no hay actividad.' : '');
      })
      .catch(() => {
        setMessage('No se pudo cargar el feed.');
      });
  }, []);

  return (
    <section>
      <h1 className="font-serif text-4xl">Actividad</h1>
      {message ? <p className="mt-4">{message}</p> : null}
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={`${item.objectId}-${item.createdAt}`} className="rounded-lg border border-line bg-white p-4">
            <p>{item.summary}</p>
            <p className="text-xs text-muted">{item.verb}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
