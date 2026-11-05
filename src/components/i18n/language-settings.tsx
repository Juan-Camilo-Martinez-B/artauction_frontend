'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { useChangeLocale } from '@/hooks/use-change-locale';
import { LOCALE_NAMES, LOCALES, type Locale } from '@/i18n/locales';

/**
 * Idioma de la cuenta en Ajustes. Se guarda al elegirlo, sin boton: el cambio
 * de toda la pagina es la confirmacion. Si la cuenta no pudo guardarlo, se
 * avisa; el aviso vive en el estado y se dibuja ya en el idioma nuevo.
 */
export function LanguageSettings() {
  const t = useTranslations('Language');
  const active = useLocale();
  const changeLocale = useChangeLocale();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const titleId = useId();

  async function choose(locale: Locale) {
    if (locale === active || pending) {
      return;
    }
    setPending(true);
    setFailed(false);
    try {
      const { savedToAccount } = await changeLocale(locale);
      setFailed(savedToAccount === false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel as="section" className="max-w-xl">
      <h2 id={titleId} className="font-serif text-xl">
        {t('settingsTitle')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('settingsHint')}</p>
      <div role="radiogroup" aria-labelledby={titleId} className="mt-4 flex flex-wrap gap-3">
        {LOCALES.map((locale) => (
          <label
            key={locale}
            lang={locale}
            className={`flex cursor-pointer items-center gap-2 rounded-field border px-4 py-2.5 text-sm ${
              locale === active ? 'border-ink bg-paper-deep font-medium' : 'border-line hover:border-line-strong'
            }`}
          >
            <input
              type="radio"
              name="locale"
              value={locale}
              checked={locale === active}
              disabled={pending}
              onChange={() => void choose(locale)}
              className="accent-oxide"
            />
            {LOCALE_NAMES[locale]}
          </label>
        ))}
      </div>
      {failed ? (
        <div className="mt-4">
          <Notice tone="error">{t('saveFailed')}</Notice>
        </div>
      ) : null}
    </Panel>
  );
}
