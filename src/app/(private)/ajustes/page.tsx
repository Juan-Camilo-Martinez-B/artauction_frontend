'use client';

import { useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';
import { ProfileMark } from '@/components/account/profile-mark';
import { LanguageSettings } from '@/components/i18n/language-settings';
import { RequireSession } from '@/components/session/require-session';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { useFormValidation } from '@/hooks/use-form-validation';
import { ApiError, artApi } from '@/lib/api/client';
import { displayNameError } from '@/lib/forms/validators';
import { browserSession, toProfile, type AccountProfile } from '@/lib/session/browser-session';

export default function SettingsPage() {
  const t = useTranslations('Settings');
  return <RequireSession title={t('signInTitle')}>{(profile) => <SettingsForm profile={profile} />}</RequireSession>;
}

type AvatarProblem = 'avatarHttps' | 'avatarComplete';

/** Una imagen vacia vuelve a las iniciales; si hay direccion, tiene que ser https. */
function avatarProblem(value: string): AvatarProblem | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  try {
    return new URL(trimmed).protocol === 'https:' ? undefined : 'avatarHttps';
  } catch {
    return 'avatarComplete';
  }
}

function SettingsForm({ profile }: { profile: AccountProfile }) {
  const t = useTranslations('Settings');
  const notify = useToast();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const avatar = avatarProblem(avatarUrl);
  const { touch, visibleError, attemptSubmit } = useFormValidation({
    displayName: displayNameError(displayName),
    avatarUrl: avatar ? t(avatar) : undefined,
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
      browserSession.replace(toProfile(updated));
      notify(t('saved'), 'success');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('saveFailed'));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <div className="space-y-6">
        <LanguageSettings />
        <Panel className="max-w-xl">
          <div className="flex items-center gap-4">
            <ProfileMark name={displayName || t('accountFallback')} avatarUrl={avatar ? null : avatarUrl.trim() || null} />
            <p className="text-sm text-muted">{t('preview')}</p>
          </div>
          <form noValidate onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
            <TextField
              id="display-name"
              label={t('nameLabel')}
              required
              maxLength={80}
              value={displayName}
              onValueChange={setDisplayName}
              onBlur={() => { touch('displayName'); }}
              error={visibleError('displayName')}
            />
            <TextField
              id="avatar-url"
              label={t('avatarLabel')}
              type="url"
              hint={t('avatarHint')}
              value={avatarUrl}
              onValueChange={setAvatarUrl}
              onBlur={() => { touch('avatarUrl'); }}
              error={visibleError('avatarUrl')}
            />
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Button type="submit" loading={pending} disabled={!dirty}>
              {pending ? t('saving') : t('save')}
            </Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
