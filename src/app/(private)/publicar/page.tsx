'use client';

import { useTranslations } from 'next-intl';
import { RequireSession } from '@/components/session/require-session';
import { PageHeader } from '@/components/ui/layout';
import { canSell } from '@/lib/session/roles';
import { LotForm } from './lot-form';

export default function NewArtworkPage() {
  const t = useTranslations('Publish.newPage');
  return (
    <RequireSession title={t('signInTitle')}>
      {(profile) => (
        <>
          <PageHeader
            eyebrow={t('eyebrow')}
            title={canSell(profile.role) ? t('titleSeller') : t('titleOwn')}
            description={canSell(profile.role) ? t('descriptionSeller') : t('descriptionOwn')}
          />
          <LotForm canSell={canSell(profile.role)} />
        </>
      )}
    </RequireSession>
  );
}
