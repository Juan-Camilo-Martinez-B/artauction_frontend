'use client';

import Link from 'next/link';
import { sectionsFor } from '@/components/account/account-menu';
import { ProfileMark } from '@/components/account/profile-mark';
import { RequireSession } from '@/components/session/require-session';
import { PageHeader } from '@/components/ui/layout';

const ROLE_LABEL: Record<string, string> = {
  USER: 'Coleccionista',
  SELLER: 'Vendedor',
  ADMIN: 'Administración',
};

const DESCRIPTIONS: Record<string, string> = {
  '/bolsillo': 'Saldo de artacoins, recargas y lo retenido en salas.',
  '/mis-obras': 'Lo que publicaste con su estado, y lo que ganaste en subasta.',
  '/feed': 'Lo que hacen las personas que sigues.',
  '/notificaciones': 'Resultados de auditorías y cierres de subasta.',
  '/publicar': 'Envía una obra nueva a auditoría.',
  '/admin': 'Obras que esperan una decisión manual.',
  '/ajustes': 'Tu nombre y tu imagen de perfil.',
};

export default function ProfilePage() {
  return (
    <RequireSession title="Entra para ver tu cuenta">
      {(profile) => (
        <>
          <PageHeader
            eyebrow={ROLE_LABEL[profile.role] ?? 'Cuenta'}
            title={profile.displayName}
            description={profile.email}
            actions={<ProfileMark name={profile.displayName} avatarUrl={profile.avatarUrl} />}
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sectionsFor(profile.role)
              .filter((section) => section.href !== '/perfil')
              .map(({ href, label, Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex h-full gap-4 rounded-panel border border-line bg-surface p-5 shadow-panel transition-shadow hover:shadow-lift"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-deep text-oxide">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-serif text-xl group-hover:underline">{label}</span>
                      <span className="mt-1 block text-sm text-muted">{DESCRIPTIONS[href]}</span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </>
      )}
    </RequireSession>
  );
}
