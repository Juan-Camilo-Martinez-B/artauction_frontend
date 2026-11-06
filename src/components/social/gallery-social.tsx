'use client';

import { Check, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useErrorText } from '@/hooks/use-error-text';
import { artApi } from '@/lib/api/client';
import { browserSession, type SessionSnapshot } from '@/lib/session/browser-session';
import { loginHref } from '@/lib/session/next-path';
import { followingOf, forgetFollowing } from '@/lib/social/following';

/**
 * Cifras de una galeria y el boton para seguirla. Van juntos porque seguir
 * cambia el numero de seguidores. Sin sesion invita a entrar y vuelve a `returnTo`;
 * en la galeria propia lleva a la sala 3D.
 */
export function GallerySocial({
  ownerId,
  workCount,
  followerCount,
  returnTo,
}: {
  ownerId: string;
  workCount: number;
  followerCount: number;
  returnTo: string;
}) {
  const t = useTranslations('PublicGallery');
  const tFollow = useTranslations('PublicGallery.follow');
  const errorText = useErrorText();
  const notify = useToast();
  const [session, setSession] = useState<SessionSnapshot>(browserSession.current());
  const [following, setFollowing] = useState(false);
  // Lo que cambio el boton respecto a la cifra que llego del servidor.
  const [delta, setDelta] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => browserSession.subscribe(setSession), []);
  useEffect(() => {
    void browserSession.restore();
  }, []);

  const signedIn = session.status === 'authenticated';
  useEffect(() => {
    if (!signedIn) {
      return;
    }
    const effect = { active: true };
    void (async () => {
      const token = await browserSession.accessToken();
      if (!token) {
        return;
      }
      // Si la lista no llega, el boton queda como "Seguir"; seguir dos veces no duplica nada.
      const ids = await followingOf(token).catch((): ReadonlySet<string> => new Set());
      if (effect.active) {
        setFollowing(ids.has(ownerId));
      }
    })();
    return () => {
      effect.active = false;
    };
  }, [signedIn, ownerId]);

  async function toggle() {
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    setPending(true);
    try {
      if (following) {
        await artApi.unfollow(token, ownerId);
        setDelta((value) => value - 1);
        notify(tFollow('unfollowDone'), 'success');
      } else {
        await artApi.follow(token, ownerId);
        setDelta((value) => value + 1);
        notify(tFollow('done'), 'success');
      }
      forgetFollowing();
      setFollowing(!following);
    } catch (caught) {
      notify(errorText(caught, following ? tFollow('unfollowFailed') : tFollow('failed')), 'error');
    } finally {
      setPending(false);
    }
  }

  function action() {
    if (session.status === 'unknown') {
      return null;
    }
    if (session.status === 'anonymous') {
      return (
        <ButtonLink href={loginHref(returnTo)} variant="secondary" icon={<UserPlus aria-hidden="true" className="h-4 w-4" />}>
          {tFollow('signIn')}
        </ButtonLink>
      );
    }
    if (session.profile?.userId === ownerId) {
      return (
        <ButtonLink href="/mi-galeria" variant="secondary">
          {tFollow('own')}
        </ButtonLink>
      );
    }
    return following ? (
      <Button variant="secondary" loading={pending} title={tFollow('unfollow')} aria-label={tFollow('unfollow')} icon={<Check aria-hidden="true" className="h-4 w-4" />} onClick={() => void toggle()}>
        {tFollow('following')}
      </Button>
    ) : (
      <Button loading={pending} icon={<UserPlus aria-hidden="true" className="h-4 w-4" />} onClick={() => void toggle()}>
        {tFollow('follow')}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        {t('works', { count: workCount })} · {t('followers', { count: Math.max(0, followerCount + delta) })}
      </p>
      {action()}
    </div>
  );
}
