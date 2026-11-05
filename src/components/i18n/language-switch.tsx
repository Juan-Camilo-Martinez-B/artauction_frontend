'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useChangeLocale } from '@/hooks/use-change-locale';
import { LOCALE_NAMES, LOCALES, type Locale } from '@/i18n/locales';

/** Botones ES · EN del pie: un clic cambia el idioma de toda la plataforma. */
export function LanguageSwitch() {
  const t = useTranslations('Language');
  const active = useLocale();
  const changeLocale = useChangeLocale();
  const [pending, setPending] = useState<Locale | null>(null);

  async function choose(locale: Locale) {
    if (locale === active || pending) {
      return;
    }
    setPending(locale);
    try {
      await changeLocale(locale);
    } finally {
      setPending(null);
    }
  }

  return (
    <div role="group" aria-label={t('label')} className="flex items-center gap-1.5">
      <span className="mr-1">{t('label')}:</span>
      {LOCALES.map((locale, index) => (
        <span key={locale} className="flex items-center gap-1.5">
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          <button
            type="button"
            lang={locale}
            aria-pressed={locale === active}
            aria-label={locale === active ? LOCALE_NAMES[locale] : t('switchTo', { language: LOCALE_NAMES[locale] })}
            disabled={pending !== null}
            onClick={() => void choose(locale)}
            className={
              locale === active
                ? 'rounded-field bg-paper-deep px-2 py-0.5 font-medium text-ink'
                : 'rounded-field px-2 py-0.5 hover:text-ink disabled:opacity-60'
            }
          >
            {locale.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
