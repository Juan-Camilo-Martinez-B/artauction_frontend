'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProfileMark } from '@/components/account/profile-mark';
import { browserSession, type AccountProfile } from '@/lib/session/browser-session';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AccountProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void browserSession.restore().then(() => {
      const profile = browserSession.current().profile;
      if (!profile) {
        setError('Entra para ver tu cuenta.');
        return;
      }
      setUser(profile);
    });
  }, []);

  async function logout() {
    await browserSession.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <section>
      <h1 className="font-serif text-4xl">Cuenta</h1>
      {error ? <p className="mt-4">{error}</p> : null}
      {user ? (
        <div className="mt-6 space-y-3">
          <ProfileMark name={user.displayName} avatarUrl={user.avatarUrl} />
          <p className="font-medium">{user.displayName}</p>
          <p>{user.email}</p>
          <p className="text-sm text-muted">Rol {user.role}</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/bolsillo">Bolsillo</Link>
            <Link href="/ajustes">Ajustes</Link>
            <Link href="/mi-galeria">Mi galería</Link>
            <Link href="/galeria">Galería social</Link>
            <Link href="/feed">Actividad</Link>
            <Link href="/notificaciones">Avisos</Link>
            {user.role === 'SELLER' || user.role === 'ADMIN' ? <Link href="/publicar">Publicar</Link> : null}
          </div>
          <button type="button" onClick={() => void logout()} className="rounded-full border border-line px-4 py-2">
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </section>
  );
}
