'use client';

import { useState, type SubmitEvent } from 'react';
import { ProfileMark } from '@/components/account/profile-mark';
import { RequireSession } from '@/components/session/require-session';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { useFormValidation } from '@/hooks/use-form-validation';
import { ApiError, artApi } from '@/lib/api/client';
import { displayNameError } from '@/lib/forms/validators';
import { browserSession, type AccountProfile } from '@/lib/session/browser-session';

export default function SettingsPage() {
  return <RequireSession title="Entra para cambiar tus ajustes">{(profile) => <SettingsForm profile={profile} />}</RequireSession>;
}

function avatarError(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  try {
    return new URL(trimmed).protocol === 'https:' ? undefined : 'La imagen debe ser una dirección https.';
  } catch {
    return 'Escribe una dirección completa, por ejemplo https://…';
  }
}

function SettingsForm({ profile }: { profile: AccountProfile }) {
  const notify = useToast();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { touch, visibleError, attemptSubmit } = useFormValidation({
    displayName: displayNameError(displayName),
    avatarUrl: avatarError(avatarUrl),
  });
  const dirty = displayName.trim() !== profile.displayName || avatarUrl.trim() !== (profile.avatarUrl ?? '');

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!attemptSubmit()) {
      return;
    }
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    setPending(true);
    try {
      const updated = await artApi.updateMe(token, { displayName: displayName.trim(), avatarUrl: avatarUrl.trim() });
      browserSession.replace({
        userId: updated.userId,
        email: updated.email,
        role: updated.role,
        displayName: updated.displayName ?? displayName.trim(),
        avatarUrl: updated.avatarUrl ?? null,
      });
      notify('Tus ajustes quedaron guardados.', 'success');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron guardar los ajustes.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Tu cuenta" title="Ajustes" description="El nombre y la imagen se ven en la cabecera y en tu galería pública." />
      <Panel className="max-w-xl">
        <div className="flex items-center gap-4">
          <ProfileMark name={displayName || 'Cuenta'} avatarUrl={avatarError(avatarUrl) ? null : avatarUrl.trim() || null} />
          <p className="text-sm text-muted">Así te verán las demás personas.</p>
        </div>
        <form noValidate onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
          <TextField
            id="display-name"
            label="Nombre"
            required
            maxLength={80}
            value={displayName}
            onValueChange={setDisplayName}
            onBlur={() => { touch('displayName'); }}
            error={visibleError('displayName')}
          />
          <TextField
            id="avatar-url"
            label="Imagen de perfil"
            type="url"
            hint="Una dirección https. Si la dejas vacía, se usan tus iniciales."
            value={avatarUrl}
            onValueChange={setAvatarUrl}
            onBlur={() => { touch('avatarUrl'); }}
            error={visibleError('avatarUrl')}
          />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button type="submit" loading={pending} disabled={!dirty}>
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      </Panel>
    </>
  );
}
