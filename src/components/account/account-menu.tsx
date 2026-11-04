'use client';

import { Bell, ClipboardCheck, LogOut, Newspaper, Palette, Settings, Upload, User, Wallet, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { loginHref } from '@/lib/session/next-path';
import { browserSession, type SessionSnapshot } from '@/lib/session/browser-session';
import { ProfileMark } from './profile-mark';

/** Texto de cada seccion en el diccionario Account. */
export type SectionLabel = 'profile' | 'wallet' | 'myWorks' | 'activity' | 'notifications' | 'newWork' | 'review' | 'settings';

interface MenuEntry {
  href: string;
  label: SectionLabel;
  Icon: LucideIcon;
  roles?: readonly string[];
}

// Un solo lugar para las secciones de la cuenta: el menu y la pagina /perfil usan la misma lista.
export const ACCOUNT_SECTIONS: readonly MenuEntry[] = [
  { href: '/perfil', label: 'profile', Icon: User },
  { href: '/bolsillo', label: 'wallet', Icon: Wallet },
  { href: '/mis-obras', label: 'myWorks', Icon: Palette },
  { href: '/feed', label: 'activity', Icon: Newspaper },
  { href: '/notificaciones', label: 'notifications', Icon: Bell },
  { href: '/publicar', label: 'newWork', Icon: Upload },
  { href: '/admin', label: 'review', Icon: ClipboardCheck, roles: ['ADMIN'] },
  { href: '/ajustes', label: 'settings', Icon: Settings },
];

export function sectionsFor(role: string): MenuEntry[] {
  return ACCOUNT_SECTIONS.filter((entry) => !entry.roles || entry.roles.includes(role));
}

export function AccountMenu() {
  const t = useTranslations('Account');
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [snapshot, setSnapshot] = useState<SessionSnapshot>({ status: 'unknown', profile: null });

  useEffect(() => browserSession.subscribe(setSnapshot), []);

  useEffect(() => {
    void browserSession.restore();
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (snapshot.status === 'unknown') {
    return <span className="h-9 w-9 animate-pulse rounded-full bg-line" aria-hidden="true" />;
  }

  if (snapshot.status === 'anonymous' || !snapshot.profile) {
    return (
      <ButtonLink href={loginHref(pathname)} size="sm">
        {t('signIn')}
      </ButtonLink>
    );
  }

  const profile = snapshot.profile;

  async function signOut() {
    setLeaving(true);
    await browserSession.signOut();
    setOpen(false);
    setLeaving(false);
    router.push('/');
    router.refresh();
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="rounded-full ring-offset-2 ring-offset-paper hover:ring-2 hover:ring-line-strong"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('menuLabel', { name: profile.displayName })}
        onClick={() => { setOpen((current) => !current); }}
      >
        <ProfileMark name={profile.displayName} avatarUrl={profile.avatarUrl} />
      </button>
      {open ? (
        <div id={menuId} role="menu" className="absolute right-0 z-50 mt-2 w-64 rounded-panel border border-line bg-surface p-2 shadow-lift">
          <div className="border-b border-line px-3 pb-3 pt-2 text-sm">
            <span className="block font-medium">{profile.displayName}</span>
            <span className="block truncate text-muted">{profile.email}</span>
          </div>
          <div className="py-1">
            {sectionsFor(profile.role).map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                aria-current={pathname === href ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-field px-3 py-2 text-sm hover:bg-paper-deep ${pathname === href ? 'bg-paper-deep font-medium' : ''}`}
              >
                <Icon aria-hidden="true" className="h-4 w-4 text-muted" />
                {t(label)}
              </Link>
            ))}
          </div>
          <button
            type="button"
            role="menuitem"
            disabled={leaving}
            className="flex w-full items-center gap-3 rounded-field border-t border-line px-3 py-2.5 text-left text-sm text-oxide hover:bg-oxide-tint disabled:opacity-60"
            onClick={() => void signOut()}
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            {leaving ? t('signingOut') : t('signOut')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
