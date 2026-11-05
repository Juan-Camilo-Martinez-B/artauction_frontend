'use client';

import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/layout';
import { loginHref } from '@/lib/session/next-path';
import { browserSession, type AccountProfile, type SessionSnapshot } from '@/lib/session/browser-session';

/**
 * Puerta comun de las paginas privadas: mientras se resuelve la sesion muestra
 * un estado de carga; sin sesion invita a entrar y vuelve a esta pagina; con un
 * rol que no alcanza lo explica. Solo con sesion valida monta el contenido.
 */
export function RequireSession({
  children,
  roles,
  title,
  description,
}: {
  children: (profile: AccountProfile) => ReactNode;
  /** Roles admitidos; sin indicar, basta con tener sesion. */
  roles?: readonly string[];
  title?: string;
  description?: string;
}) {
  const t = useTranslations('Session');
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(browserSession.current());

  useEffect(() => browserSession.subscribe(setSnapshot), []);
  useEffect(() => {
    void browserSession.restore();
  }, []);

  if (snapshot.status === 'unknown') {
    return <LoadingState label={t('checking')} />;
  }
  if (snapshot.status === 'anonymous' || !snapshot.profile) {
    return (
      <EmptyState
        icon={<LogIn aria-hidden="true" className="h-6 w-6" />}
        title={title ?? t('signInTitle')}
        description={description ?? t('signInHint')}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href={loginHref(pathname)}>{t('signIn')}</ButtonLink>
            <ButtonLink href="/registro" variant="secondary">
              {t('createAccount')}
            </ButtonLink>
          </div>
        }
      />
    );
  }
  if (roles && !roles.includes(snapshot.profile.role)) {
    return (
      <EmptyState
        title={t('wrongRole')}
        description={roles.includes('SELLER') ? t('sellerOnly') : t('adminOnly')}
        action={<ButtonLink href="/catalogo" variant="secondary">{t('toCatalog')}</ButtonLink>}
      />
    );
  }
  return <>{children(snapshot.profile)}</>;
}
