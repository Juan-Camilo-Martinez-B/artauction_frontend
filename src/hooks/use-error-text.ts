'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { errorText, toErrorLike, type ErrorLike, type ErrorTranslator } from '@/lib/api/error-text';

/**
 * Devuelve una funcion que convierte un error atrapado (o un rechazo de puja)
 * en el texto que ve la persona, en su idioma. `fallback` es el texto de la
 * accion que fallo, ya traducido.
 */
export function useErrorText(): (caught: unknown, fallback: string) => string {
  const locale = useLocale();
  const t = useTranslations('Errors');
  return useCallback(
    (caught: unknown, fallback: string) => {
      const error: ErrorLike | null = isErrorLike(caught) ? caught : toErrorLike(caught);
      return errorText(error, locale, t as unknown as ErrorTranslator, fallback);
    },
    [locale, t],
  );
}

function isErrorLike(value: unknown): value is ErrorLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Error) &&
    typeof (value as { message?: unknown }).message === 'string' &&
    'code' in value &&
    'params' in value
  );
}
