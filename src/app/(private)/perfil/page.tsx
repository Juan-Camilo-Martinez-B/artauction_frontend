'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { sectionsFor } from '@/components/account/account-menu';
import { ProfileMark } from '@/components/account/profile-mark';
import { RequireSession } from '@/components/session/require-session';
import { PageHeader } from '@/components/ui/layout';

const ROLES = ['USER', 'SELLER', 'ADMIN'] as const;

function isRole(value: string): value is (typeof ROLES)[number] {
  return (ROLES as readonly string[]).includes(value);
}

export default function ProfilePage() {
  const t = useTranslations('Profile');
  const tAccount = useTranslations('Account');
  return (
    <RequireSession title={t('signInTitle')}>
      {(profile) => (
        <>
          <PageHeader
            eyebrow={isRole(profile.role) ? t(`roles.${profile.role}`) : t('account')}
            title={profile.displayName}
            description={profile.email}
            actions={<ProfileMark name={profile.displayName} avatarUrl={profile.avatarUrl} />}
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sectionsFor(profile.role)
              .filter((section) => section.label !== 'profile')
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
                      <span className="block font-serif text-xl group-hover:underline">{tAccount(label)}</span>
                      <span className="mt-1 block text-sm text-muted">{t(`descriptions.${label}`)}</span>
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
