'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { rememberLocale } from '@/i18n/browser';
import { browserSession } from '@/lib/session/browser-session';

/**
 * Al entrar, manda el idioma guardado en la cuenta: si difiere del que se esta
 * viendo, se recuerda en la cookie y la pagina se vuelve a pedir. Si la cookie
 * no se puede guardar (cookies bloqueadas) no se refresca, para no entrar en
 * un ciclo de recargas. Tambien se revisa al cambiar de ruta: el login navega
 * justo despues de refrescar y esa navegacion puede traer el layout anterior.
 */
export function LocaleSync() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(
    () =>
      browserSession.subscribe((snapshot) => {
        const preferred = snapshot.profile?.locale;
        if (snapshot.status === 'authenticated' && preferred && preferred !== locale && rememberLocale(preferred)) {
          router.refresh();
        }
      }),
    [locale, router, pathname],
  );

  return null;
}
