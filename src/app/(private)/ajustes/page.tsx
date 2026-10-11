'use client';

import { useEffect, useState, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormError } from '@/components/field';
import { ProfileMark } from '@/components/account/profile-mark';
import { ApiError, artApi } from '@/lib/api/client';
import { browserSession } from '@/lib/session/browser-session';

export default function SettingsPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void browserSession.restore().then(() => {
      const profile = browserSession.current().profile;
      if (!profile) {
        router.replace('/entrar');
        return;
      }
      setDisplayName(profile.displayName);
      setAvatarUrl(profile.avatarUrl ?? '');
    });
  }, [router]);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = await browserSession.accessToken();
    if (!token) {
      router.replace('/entrar');
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const profile = await artApi.updateMe(token, { displayName, avatarUrl });
      browserSession.replace({
        userId: profile.userId,
        email: profile.email,
        role: profile.role,
        displayName: profile.displayName ?? displayName,
        avatarUrl: profile.avatarUrl ?? null,
      });
      setMessage('Los cambios quedaron guardados.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron guardar los ajustes.');
    }
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="font-serif text-4xl">Ajustes</h1>
      <p className="mt-3 text-sm text-muted">El nombre y la imagen se guardan en tu cuenta y se ven en la cabecera.</p>
      <div className="mt-6">
        <ProfileMark name={displayName || 'Cuenta'} avatarUrl={avatarUrl.trim() || null} />
      </div>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
        <Field id="display-name" label="Nombre" required minLength={2} maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        <Field
          id="avatar-url"
          label="Imagen de perfil"
          type="url"
          hint="Una dirección https. Si la dejas vacía, la cabecera usa tus iniciales."
          value={avatarUrl}
          onChange={(event) => setAvatarUrl(event.target.value)}
        />
        {error ? <FormError>{error}</FormError> : null}
        {message ? <p className="text-sm">{message}</p> : null}
        <button type="submit" className="rounded-full bg-ink px-5 py-2 text-paper">
          Guardar
        </button>
      </form>
    </section>
  );
}
