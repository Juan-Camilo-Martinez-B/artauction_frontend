'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { formatDateTime, formatDecimal, formatInteger, formatMoney, formatRelative } from '@/lib/format';

/** Formateadores atados al idioma activo, para componentes de cliente. */
export function useFormat() {
  const locale = useLocale();
  return useMemo(
    () => ({
      locale,
      dateTime: (value: string | Date) => formatDateTime(value, locale),
      relative: (value: string | Date, now?: Date) => formatRelative(value, locale, now),
      integer: (value: number) => formatInteger(value, locale),
      decimal: (value: number) => formatDecimal(value, locale),
      money: (value: string | number | null | undefined, currency?: string) => formatMoney(value, locale, currency),
    }),
    [locale],
  );
}
