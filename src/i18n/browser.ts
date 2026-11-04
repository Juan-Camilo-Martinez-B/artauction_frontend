import { DEFAULT_LOCALE, isLocale, localeCookie, localeFromCookies, type Locale } from './locales';

/**
 * Idioma activo en el navegador: el de la cookie o, si no hay, el que uso el
 * servidor para la pagina (atributo lang). Fuera del navegador, espanol.
 */
export function browserLocale(): Locale {
  if (typeof document === 'undefined') {
    return DEFAULT_LOCALE;
  }
  const lang = document.documentElement.lang;
  return localeFromCookies(document.cookie) ?? (isLocale(lang) ? lang : DEFAULT_LOCALE);
}

/**
 * Recuerda el idioma en la cookie que lee el servidor. Devuelve si quedo
 * guardado: con las cookies bloqueadas no se puede cambiar sin sesion.
 */
export function rememberLocale(locale: Locale): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${localeCookie(locale)}${secure}`;
  return localeFromCookies(document.cookie) === locale;
}
