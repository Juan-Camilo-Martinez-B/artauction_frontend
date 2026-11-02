'use client';

import { FlaskConical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { ApiError, artApi } from '@/lib/api/client';
import { browserSession } from '@/lib/session/browser-session';

/**
 * Funcion de prueba: cuelga la obra en tu galeria sin ganarla. En el flujo
 * real una obra llega a la galeria de quien gana su subasta.
 */
export function AddToGalleryButton({ lotId }: { lotId: string }) {
  const router = useRouter();
  const notify = useToast();
  const [pending, setPending] = useState(false);

  async function add() {
    const token = await browserSession.accessToken();
    if (!token) {
      router.push('/entrar');
      return;
    }
    setPending(true);
    try {
      await artApi.addToGallery(token, lotId);
      notify('La obra quedó en tu galería.', 'success');
    } catch (caught) {
      notify(caught instanceof ApiError ? caught.message : 'No se pudo añadir la obra.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-field border border-dashed border-ochre/50 bg-ochre-tint/40 p-3">
      <Button variant="secondary" size="sm" loading={pending} icon={<FlaskConical aria-hidden="true" className="h-4 w-4" />} onClick={() => void add()}>
        {pending ? 'Añadiendo…' : 'Añadir a mi galería'}
      </Button>
      <p className="mt-2 text-xs text-ochre">Función de prueba: en el flujo real, la obra llega a tu galería cuando ganas su subasta.</p>
    </div>
  );
}
