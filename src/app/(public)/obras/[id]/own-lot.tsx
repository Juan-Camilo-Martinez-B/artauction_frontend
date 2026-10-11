'use client';

import { useEffect, useState } from 'react';
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
    return <p>Esta obra no está en el catálogo público.</p>;
  }
  return <p>Abriendo la ficha…</p>;
}
