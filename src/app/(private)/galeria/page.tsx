'use client';

import { useEffect, useState } from 'react';
import { artApi } from '@/lib/api/client';
import { readAccessToken } from '@/lib/session';
import { canShowGalleryItem } from '@/lib/visibility';
import type { GalleryItem } from '@/lib/api/types';

export default function PrivateGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [message, setMessage] = useState('Cargando tu galería…');

  useEffect(() => {
    const token = readAccessToken();
    if (!token) {
      setMessage('Entra para ver tu galería.');
      return;
    }
    void artApi
      .me(token)
      .then((user) => artApi.gallery(user.userId, token).then((rows) => ({ user, rows })))
      .then(({ user, rows }) => {
        setItems(rows.filter((item) => canShowGalleryItem(item, user.userId)));
        setMessage('');
      })
      .catch(() => {
        setMessage('No se pudo abrir la galería.');
      });
  }, []);

  return (
    <section>
      <h1 className="font-serif text-4xl">Tu galería</h1>
      <p className="mt-2 text-sm text-muted">Esta página no se guarda en caché compartida.</p>
      {message ? <p className="mt-6">{message}</p> : null}
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={`${item.lotId ?? item.title}-${item.acquiredAt}`} className="rounded-lg border border-line bg-white p-4">
            <p className="font-serif text-2xl">{item.title}</p>
            <p className="text-sm text-muted">
              {item.source} · {item.visibility}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
