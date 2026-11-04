'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { rememberLocale } from '@/i18n/browser';
import type { Locale } from '@/i18n/locales';
import { artApi } from '@/lib/api/client';
import { browserSession, toProfile } from '@/lib/session/browser-session';

/** Resultado de cambiar el idioma: si quedo guardado en la cuenta (con sesion). */
export interface LocaleChange {
  savedToAccount: boolean | null;
}

/**
 * Cambia el idioma de la interfaz: lo recuerda en la cookie que lee el
 * servidor, lo guarda en la cuenta si hay sesion y vuelve a pedir la pagina
 * para que el servidor la entregue en el idioma nuevo.
 */
export function useChangeLocale(): (locale: Locale) => Promise<LocaleChange> {
  const router = useRouter();
  return useCallback(
    async (locale: Locale) => {
      rememberLocale(locale);
      const session = browserSession.current();
      let savedToAccount: boolean | null = null;
      if (session.status === 'authenticated' && session.profile) {
        try {
          const token = await browserSession.accessToken();
          if (!token) {
            throw new Error('sin sesion');
          }
          browserSession.replace(toProfile(await artApi.updatePreferences(token, locale)));
          savedToAccount = true;
        } catch {
          // Se aplica igual en este navegador; la cuenta conserva el idioma anterior.
          browserSession.replace({ ...session.profile, locale });
          savedToAccount = false;
        }
      }
      router.refresh();
      return { savedToAccount };
    },
    [router],
  );
}
