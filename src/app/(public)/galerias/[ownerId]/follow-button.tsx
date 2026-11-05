'use client';

import { Check, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useErrorText } from '@/hooks/use-error-text';
import { artApi } from '@/lib/api/client';
import { loginHref } from '@/lib/session/next-path';
import { browserSession, type SessionSnapshot } from '@/lib/session/browser-session';

/** Seguir una galeria: invita a entrar si no hay sesion y no aparece en la galeria propia. */
export function FollowButton({ ownerId }: { ownerId: string }) {
  const t = useTranslations('PublicGallery.follow');
  const errorText = useErrorText();
  const notify = useToast();
  const [session, setSession] = useState<SessionSnapshot>(browserSession.current());
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => browserSession.subscribe(setSession), []);
  useEffect(() => {
    void browserSession.restore();
  }, []);

  if (session.status === 'unknown') {
    return null;
  }
  if (session.status === 'anonymous') {
    return (
      <ButtonLink href={loginHref(`/galerias/${ownerId}`)} variant="secondary" icon={<UserPlus aria-hidden="true" className="h-4 w-4" />}>
        {t('signIn')}
      </ButtonLink>
    );
  }
  if (session.profile?.userId === ownerId) {
    return (
      <ButtonLink href="/mi-galeria" variant="secondary">
        {t('own')}
      </ButtonLink>
    );
  }

  async function follow() {
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    setPending(true);
    try {
      await artApi.follow(token, ownerId);
      setFollowing(true);
      notify(t('done'), 'success');
    } catch (caught) {
      notify(errorText(caught, t('failed')), 'error');
    } finally {
      setPending(false);
    }
  }

  return following ? (
    <Button variant="secondary" disabled icon={<Check aria-hidden="true" className="h-4 w-4" />}>
      {t('following')}
    </Button>
  ) : (
    <Button loading={pending} icon={<UserPlus aria-hidden="true" className="h-4 w-4" />} onClick={() => void follow()}>
      {t('follow')}
    </Button>
  );
}
