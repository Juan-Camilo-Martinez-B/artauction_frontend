'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { browserSession, type SessionSnapshot } from '@/lib/session/browser-session';
import { ProfileMark } from './profile-mark';

export function AccountMenu() {
  const router = useRouter();
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<SessionSnapshot>({ status: 'unknown', profile: null });

  useEffect(() => browserSession.subscribe(setSnapshot), []);

  useEffect(() => {
    void browserSession.restore();
  }, []);

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
    return <span className="h-9 w-9 rounded-full bg-line" aria-hidden="true" />;
  }

  if (snapshot.status === 'anonymous' || !snapshot.profile) {
    return (
      <Link href="/entrar" className="rounded-full bg-ink px-3 py-1.5 text-paper">
        Entrar
      </Link>
    );
  }

  const profile = snapshot.profile;

  async function signOut() {
    setOpen(false);
    await browserSession.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="rounded-full"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Cuenta de ${profile.displayName}`}
        onClick={() => setOpen((current) => !current)}
      >
        <ProfileMark name={profile.displayName} avatarUrl={profile.avatarUrl} />
      </button>
      {open ? (
        <div id={menuId} role="menu" className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-line bg-paper p-2 shadow-lg">
          <p className="px-3 py-2 text-sm">
            <span className="block font-medium">{profile.displayName}</span>
            <span className="block truncate text-muted">{profile.email}</span>
          </p>
          <MenuLink href="/ajustes" onNavigate={() => setOpen(false)}>
            Ajustes
          </MenuLink>
          <MenuLink href="/perfil" onNavigate={() => setOpen(false)}>
            Cuenta
          </MenuLink>
          {profile.role === 'ADMIN' ? (
            <MenuLink href="/admin" onNavigate={() => setOpen(false)}>
              Revisión
            </MenuLink>
          ) : null}
          <button type="button" role="menuitem" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, children, onNavigate }: { href: string; children: string; onNavigate: () => void }) {
  return (
    <Link href={href} role="menuitem" className="block rounded-lg px-3 py-2 text-sm hover:bg-white" onClick={onNavigate}>
      {children}
    </Link>
  );
}
