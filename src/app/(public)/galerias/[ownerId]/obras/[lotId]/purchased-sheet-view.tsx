'use client';

import { useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/layout';
import { artApi } from '@/lib/api/client';
import type { PurchasedSheet } from '@/lib/api/types';
import { browserSession } from '@/lib/session/browser-session';
import { ArtworkExhibit } from '@/app/(public)/obras/[id]/artwork-exhibit';

type Loaded = { kind: 'loading' } | { kind: 'ready'; sheet: PurchasedSheet } | { kind: 'missing' };

export function PurchasedSheetView({ ownerId, lotId }: { ownerId: string; lotId: string }) {
  const [state, setState] = useState<Loaded>({ kind: 'loading' });

  useEffect(() => {
    // Con sesion, la duena ve su ficha aunque sea privada y con el precio pagado.
    void browserSession.accessToken().then(async (token) => {
      try {
        const sheet = await artApi.purchasedSheet(ownerId, lotId, token);
        setState(sheet.lot ? { kind: 'ready', sheet } : { kind: 'missing' });
      } catch {
        setState({ kind: 'missing' });
      }
    });
  }, [ownerId, lotId]);

  if (state.kind === 'loading') {
    return <LoadingState label="Abriendo la ficha…" />;
  }
  if (state.kind === 'missing' || !state.sheet.lot) {
    return (
      <EmptyState
        title="Esta ficha no está disponible"
        description="Puede que la obra sea privada en esta galería o que el enlace esté mal."
        action={<ButtonLink href={`/galerias/${ownerId}`} variant="secondary">Ver la galería</ButtonLink>}
      />
    );
  }
  const { lot, pricePaid, buyNow, acquiredAt } = state.sheet;
  return <ArtworkExhibit lot={lot} purchase={{ pricePaid, buyNow, acquiredAt }} />;
}
