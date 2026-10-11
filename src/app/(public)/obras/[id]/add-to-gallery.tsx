'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, artApi } from '@/lib/api/client';
import { browserSession } from '@/lib/session/browser-session';

export function AddToGalleryButton({ lotId }: { lotId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function add() {
    const token = await browserSession.accessToken();
    if (!token) {
      router.push('/entrar');
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      await artApi.addToGallery(token, lotId);
      setMessage('La obra quedó en tu galería.');
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : 'No se pudo añadir la obra.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void add()}
        disabled={pending}
        className="rounded-full border border-ink px-5 py-2 text-sm"
      >
        {pending ? 'Añadiendo…' : 'Añadir a mi galería'}
      </button>
      {message ? <p className="mt-2 text-sm">{message}</p> : null}
    </div>
  );
}
