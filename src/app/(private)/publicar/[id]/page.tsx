'use client';

import { useTranslations } from 'next-intl';
import { use, useEffect, useState } from 'react';
import { RequireSession } from '@/components/session/require-session';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/layout';
import { artApi } from '@/lib/api/client';
import type { Lot } from '@/lib/api/types';
import { isEditable } from '@/lib/artwork/lot-review';
import { browserSession } from '@/lib/session/browser-session';
import { canSell } from '@/lib/session/roles';
import { LotForm } from '../lot-form';

export default function EditLotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('Publish.editPage');
  return (
    <RequireSession title={t('signInTitle')}>
      {(profile) => <EditLot id={id} userId={profile.userId} sells={canSell(profile.role)} />}
    </RequireSession>
  );
}

type Loaded = { kind: 'loading' } | { kind: 'ready'; lot: Lot } | { kind: 'locked'; lot: Lot } | { kind: 'missing' };

function EditLot({ id, userId, sells }: { id: string; userId: string; sells: boolean }) {
  const t = useTranslations('Publish.editPage');
  const [state, setState] = useState<Loaded>({ kind: 'loading' });

  useEffect(() => {
    void browserSession.accessToken().then(async (token) => {
      if (!token) {
        setState({ kind: 'missing' });
        return;
      }
      try {
        const lot = await artApi.lot(id, token);
        // catalog-service vuelve a comprobarlo al guardar; aqui solo se evita
        // mostrar un formulario que no se podra enviar.
        if (lot.sellerId !== userId) {
          setState({ kind: 'missing' });
          return;
        }
        setState(isEditable(lot) ? { kind: 'ready', lot } : { kind: 'locked', lot });
      } catch {
        setState({ kind: 'missing' });
      }
    });
  }, [id, userId]);

  if (state.kind === 'loading') {
    return <LoadingState label={t('opening')} />;
  }
  if (state.kind === 'missing') {
    return (
      <EmptyState
        title={t('missing.title')}
        description={t('missing.description')}
        action={<ButtonLink href="/mis-obras" variant="secondary">{t('missing.action')}</ButtonLink>}
      />
    );
  }
  if (state.kind === 'locked') {
    return (
      <EmptyState
        title={t('locked.title')}
        description={t('locked.description')}
        action={<ButtonLink href={`/obras/${state.lot.id}`} variant="secondary">{t('locked.action')}</ButtonLink>}
      />
    );
  }
  return (
    <>
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title', { title: state.lot.original?.title ?? state.lot.title })}
        description={state.lot.status === 'PERSONAL' ? t('descriptionOwn') : t('descriptionCatalog')}
      />
      <LotForm lot={state.lot} canSell={sells} />
    </>
  );
}
