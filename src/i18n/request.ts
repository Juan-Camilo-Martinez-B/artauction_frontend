import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from './locales';
import { loadMessages } from './messages';

/**
 * Idioma de cada render en el servidor. Sin prefijo en la URL: manda la cookie
 * (la eleccion de la persona o el idioma de su cuenta); sin cookie, el idioma
 * del navegador. Asi quien llega por primera vez ve la plataforma en su idioma.
 */
export async function requestLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) {
    return chosen;
  }
  return negotiateLocale((await headers()).get('accept-language'));
}

export default getRequestConfig(async () => {
  const locale = await requestLocale();
  return { locale, messages: await loadMessages(locale) };
});
