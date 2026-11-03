'use client';

import { LogIn } from 'lucide-react';
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
  title = 'Entra para continuar',
  description,
}: {
  children: (profile: AccountProfile) => ReactNode;
  /** Roles admitidos; sin indicar, basta con tener sesion. */
  roles?: readonly string[];
  title?: string;
  description?: string;
}) {
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(browserSession.current());

  useEffect(() => browserSession.subscribe(setSnapshot), []);
  useEffect(() => {
    void browserSession.restore();
  }, []);

  if (snapshot.status === 'unknown') {
    return <LoadingState label="Comprobando tu sesión…" />;
  }
  if (snapshot.status === 'anonymous' || !snapshot.profile) {
    return (
      <EmptyState
        icon={<LogIn aria-hidden="true" className="h-6 w-6" />}
        title={title}
        description={description ?? 'Esta sección es de tu cuenta. Entra y vuelves aquí mismo.'}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href={loginHref(pathname)}>Entrar</ButtonLink>
            <ButtonLink href="/registro" variant="secondary">
              Crear cuenta
            </ButtonLink>
          </div>
        }
      />
    );
  }
  if (roles && !roles.includes(snapshot.profile.role)) {
    return (
      <EmptyState
        title="Esta sección no es para tu cuenta"
        description={roles.includes('SELLER') ? 'Solo una cuenta de vendedor puede publicar obras.' : 'Solo una cuenta administradora puede entrar aquí.'}
        action={<ButtonLink href="/catalogo" variant="secondary">Ir al catálogo</ButtonLink>}
      />
    );
  }
  return <>{children(snapshot.profile)}</>;
}
