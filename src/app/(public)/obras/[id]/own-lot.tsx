'use client';

import { useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/layout';
import { artApi } from '@/lib/api/client';
import type { Lot } from '@/lib/api/types';
import { browserSession } from '@/lib/session/browser-session';
import { ArtworkExhibit } from './artwork-exhibit';

export function OwnLot({ id }: { id: string }) {
  const [lot, setLot] = useState<Lot | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    void browserSession.accessToken().then(async (token) => {
      if (!token) {
        setMissing(true);
        return;
      }
      try {
        setLot(await artApi.lot(id, token));
      } catch {
        setMissing(true);
      }
    });
  }, [id]);

  if (lot) {
    return <ArtworkExhibit lot={lot} />;
  }
  if (missing) {
    return (
      <EmptyState
        title="Esta obra no está disponible"
        description="Puede que sea privada, que se haya vendido o que el enlace esté mal."
        action={<ButtonLink href="/catalogo" variant="secondary">Volver al catálogo</ButtonLink>}
      />
    );
  }
  return <LoadingState label="Abriendo la ficha…" />;
}
