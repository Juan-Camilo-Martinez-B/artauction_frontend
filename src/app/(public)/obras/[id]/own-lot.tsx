'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/layout';
import { artApi } from '@/lib/api/client';
import type { Lot } from '@/lib/api/types';
import { browserSession } from '@/lib/session/browser-session';
import { ArtworkExhibit } from './artwork-exhibit';

export function OwnLot({ id }: { id: string }) {
  const t = useTranslations('Artwork.unavailable');
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
        title={t('title')}
        description={t('description')}
        action={<ButtonLink href="/catalogo" variant="secondary">{t('action')}</ButtonLink>}
      />
    );
  }
  return <LoadingState label={t('opening')} />;
}
