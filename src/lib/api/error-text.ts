import type { Locale } from '@/i18n/locales';
import { ApiError } from './client';

/** Lo que trae un error del backend, por REST (ApiError) o por Socket.IO (bid:rejected). */
export interface ErrorLike {
  message: string;
  code: string | null;
  params: Readonly<Record<string, string>>;
}

/**
 * Codigos genericos cuyo mensaje del servidor (en espanol) es mas preciso que
 * el texto generico: en espanol se muestra ese mensaje; en ingles, el generico.
 * El resto de codigos (los especificos, VALIDATION_FAILED, INTERNAL...) siempre
 * salen del diccionario.
 */
const SERVER_DETAIL_CODES: ReadonlySet<string> = new Set([
  'INVALID_ARGUMENT',
  'NOT_FOUND',
  'CONFLICT',
  'PERMISSION_DENIED',
  'UNAUTHENTICATED',
  'FAILED_PRECONDITION',
  'UNAVAILABLE',
]);

/** Traductor minimo que necesita: el de next-intl sobre el espacio Errors cumple. */
export interface ErrorTranslator {
  (key: string, values?: Record<string, string>): string;
  has(key: string): boolean;
}

export function toErrorLike(caught: unknown): ErrorLike | null {
  if (caught instanceof ApiError) {
    return { message: caught.message, code: caught.code, params: caught.params };
  }
  return null;
}

/**
 * Texto de un error para quien mira. `fallback` es el texto ya traducido de la
 * accion que fallo ("No se pudo guardar"), para errores sin codigo o de red.
 */
export function errorText(error: ErrorLike | null, locale: Locale, t: ErrorTranslator, fallback: string): string {
  if (!error) {
    return fallback;
  }
  const { code, message, params } = error;
  if (code && !SERVER_DETAIL_CODES.has(code) && t.has(code)) {
    return t(code, { ...params });
  }
  if (locale === 'es' && message) {
    return message;
  }
  if (code && t.has(code)) {
    return t(code, { ...params });
  }
  return fallback;
}
