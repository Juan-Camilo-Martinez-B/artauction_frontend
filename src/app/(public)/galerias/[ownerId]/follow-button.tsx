'use client';

import { Check, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { ApiError, artApi } from '@/lib/api/client';
import { loginHref } from '@/lib/session/next-path';
import { browserSession, type SessionSnapshot } from '@/lib/session/browser-session';

/** Seguir una galeria: invita a entrar si no hay sesion y no aparece en la galeria propia. */
export function FollowButton({ ownerId }: { ownerId: string }) {
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
        Entrar para seguir
      </ButtonLink>
    );
  }
  if (session.profile?.userId === ownerId) {
    return (
      <ButtonLink href="/mi-galeria" variant="secondary">
        Es tu galería: ir a la sala 3D
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
      notify('Ahora sigues esta galería. Su actividad aparecerá en tu feed.', 'success');
    } catch (caught) {
      notify(caught instanceof ApiError ? caught.message : 'No se pudo seguir esta galería.', 'error');
    } finally {
      setPending(false);
    }
  }

  return following ? (
    <Button variant="secondary" disabled icon={<Check aria-hidden="true" className="h-4 w-4" />}>
      Siguiendo
    </Button>
  ) : (
    <Button loading={pending} icon={<UserPlus aria-hidden="true" className="h-4 w-4" />} onClick={() => void follow()}>
      Seguir galería
    </Button>
  );
}
