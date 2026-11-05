/** Idiomas de la interfaz. El espanol es el de omision. */
export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

/** Cookie con el idioma elegido; la leen el servidor (render) y el navegador (API). */
export const LOCALE_COOKIE = 'NEXT_LOCALE';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Etiqueta BCP 47 para Intl: los numeros y fechas en espanol siguen el formato colombiano. */
export const INTL_LOCALE: Readonly<Record<Locale, string>> = { es: 'es-CO', en: 'en-US' };

/** Nombre de cada idioma escrito en ese mismo idioma, como lo busca quien lo habla. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = { es: 'Español', en: 'English' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Idioma preferido segun Accept-Language (RFC 9110): el de mayor peso q entre
 * los que la plataforma ofrece, mirando solo la etiqueta principal ("en-US"
 * cuenta como "en"). Sin coincidencias, espanol. Es lo que ve quien llega por
 * primera vez sin haber elegido idioma.
 */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) {
    return DEFAULT_LOCALE;
  }
  let best: { locale: Locale; quality: number } | null = null;
  for (const entry of header.split(',').slice(0, 20)) {
    const [tag = '', ...params] = entry.trim().split(';');
    const primary = tag.trim().toLowerCase().split('-')[0];
    if (!isLocale(primary)) {
      continue;
    }
    const qParam = params.map((param) => param.trim()).find((param) => param.startsWith('q='));
    const quality = qParam ? Number(qParam.slice(2)) : 1;
    if (Number.isFinite(quality) && quality > 0 && (!best || quality > best.quality)) {
      best = { locale: primary, quality };
    }
  }
  return best?.locale ?? DEFAULT_LOCALE;
}

/** Valor de Set-Cookie / document.cookie para recordar el idioma un ano. */
export function localeCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${String(ONE_YEAR_SECONDS)}; SameSite=Lax`;
}

/** Idioma guardado en una cabecera Cookie o en document.cookie, si hay uno valido. */
export function localeFromCookies(cookieHeader: string): Locale | null {
  for (const part of cookieHeader.split(';')) {
    const [name, value] = part.trim().split('=');
    if (name === LOCALE_COOKIE && isLocale(value)) {
      return value;
    }
  }
  return null;
}
