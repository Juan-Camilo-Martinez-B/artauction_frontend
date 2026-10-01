'use client';

import { useState } from 'react';
import { ApiError, artApi } from '@/lib/api/client';
import { readAccessToken } from '@/lib/session';

export function FollowButton({ ownerId }: { ownerId: string }) {
  const [message, setMessage] = useState<string | null>(null);

  async function follow() {
    const token = readAccessToken();
    if (!token) {
      setMessage('Entra para seguir a esta persona.');
      return;
    }
    try {
      await artApi.follow(token, ownerId);
      setMessage('Ahora sigues esta galería.');
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : 'No se pudo seguir.');
    }
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={() => void follow()} className="rounded-full border border-line px-4 py-2 text-sm">
        Seguir
      </button>
      {message ? <p className="mt-2 text-sm">{message}</p> : null}
    </div>
  );
}
