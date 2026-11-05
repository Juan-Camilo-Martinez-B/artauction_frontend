'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/layout';
import { artApi } from '@/lib/api/client';
import type { PurchasedSheet } from '@/lib/api/types';
import { browserSession } from '@/lib/session/browser-session';
import { ArtworkExhibit } from '@/app/(public)/obras/[id]/artwork-exhibit';

type Loaded = { kind: 'loading' } | { kind: 'ready'; sheet: PurchasedSheet } | { kind: 'missing' };

export function PurchasedSheetView({ ownerId, lotId }: { ownerId: string; lotId: string }) {
  const t = useTranslations('Artwork.unavailableSheet');
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
    return <LoadingState label={t('opening')} />;
  }
  if (state.kind === 'missing' || !state.sheet.lot) {
    return (
      <EmptyState
        title={t('title')}
        description={t('description')}
        action={<ButtonLink href={`/galerias/${ownerId}`} variant="secondary">{t('action')}</ButtonLink>}
      />
    );
  }
  const { lot, pricePaid, buyNow, acquiredAt } = state.sheet;
  return <ArtworkExhibit lot={lot} purchase={{ pricePaid, buyNow, acquiredAt }} />;
}
