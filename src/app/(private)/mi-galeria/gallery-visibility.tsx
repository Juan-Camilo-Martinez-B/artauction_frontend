'use client';

import { Eye, EyeOff, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useErrorText } from '@/hooks/use-error-text';
import { artApi } from '@/lib/api/client';
import type { PersonalGallery } from '@/lib/api/types';
import { browserSession } from '@/lib/session/browser-session';

/** Abre o cierra la galeria a los visitantes y explica que veran. */
export function GalleryVisibility({ gallery, onChange }: { gallery: PersonalGallery; onChange: (next: PersonalGallery) => void }) {
  const t = useTranslations('Studio.visibility');
  const errorText = useErrorText();
  const notify = useToast();
  const [pending, setPending] = useState(false);
  const isPublic = gallery.visibility === 'PUBLIC';

  async function toggle() {
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    setPending(true);
    try {
      onChange(await artApi.setGalleryVisibility(token, isPublic ? 'PRIVATE' : 'PUBLIC'));
      notify(isPublic ? t('nowPrivate') : t('nowPublic'), 'success');
    } catch (caught) {
      notify(errorText(caught, t('failed')), 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label={t('label')} className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-surface p-4">
      <div className="flex min-w-0 max-w-2xl items-start gap-3">
        {isPublic ? <Eye aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-oxide" /> : <Lock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-muted" />}
        <div className="min-w-0">
          <p className="font-medium">{isPublic ? t('publicTitle') : t('privateTitle')}</p>
          <p className="text-sm text-muted">
            {isPublic ? t('publicHint') : t('privateHint')} {t('worksHint')}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/galerias/${gallery.ownerId}`} variant="ghost" size="sm">
          {t('preview')}
        </ButtonLink>
        <ButtonLink href="/mis-obras" variant="ghost" size="sm">
          {t('myWorks')}
        </ButtonLink>
        <Button
          variant={isPublic ? 'secondary' : 'primary'}
          size="sm"
          loading={pending}
          icon={isPublic ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
          onClick={() => void toggle()}
        >
          {isPublic ? t('makePrivate') : t('makePublic')}
        </Button>
      </div>
    </section>
  );
}
