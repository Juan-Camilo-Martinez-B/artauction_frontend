import { INTL_LOCALE, type Locale } from '@/i18n/locales';

// Fechas y numeros en un solo formato por idioma para todo el sitio. Crear un
// Intl.*Format es caro: se guarda uno por idioma y opciones.

const cache = new Map<string, Intl.DateTimeFormat | Intl.RelativeTimeFormat | Intl.NumberFormat>();

function cached<T extends Intl.DateTimeFormat | Intl.RelativeTimeFormat | Intl.NumberFormat>(key: string, create: () => T): T {
  let formatter = cache.get(key) as T | undefined;
  if (!formatter) {
    formatter = create();
    cache.set(key, formatter);
  }
  return formatter;
}

const dateTime = (locale: Locale) =>
  cached(`dt:${locale}`, () => new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: 'medium', timeStyle: 'short' }));
const relative = (locale: Locale) => cached(`rel:${locale}`, () => new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: 'auto' }));
const integer = (locale: Locale) => cached(`int:${locale}`, () => new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 0 }));
const decimal = (locale: Locale) => cached(`dec:${locale}`, () => new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 2 }));

const STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
];

function toDate(value: string | Date): Date | null {
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | Date, locale: Locale): string {
  const date = toDate(value);
  return date ? dateTime(locale).format(date) : '';
}

/** "hace 5 minutos", "in 2 hours", "ayer"... respecto de `now`. */
export function formatRelative(value: string | Date, locale: Locale, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) {
    return '';
  }
  let amount = (date.getTime() - now.getTime()) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(amount) < size) {
      return relative(locale).format(Math.round(amount), unit);
    }
    amount /= size;
  }
  return dateTime(locale).format(date);
}

/** Entero con separador de miles del idioma: 1.234 en espanol, 1,234 en ingles. */
export function formatInteger(value: number, locale: Locale): string {
  return integer(locale).format(Math.round(value));
}

/** Numero con hasta dos decimales (medidas en centimetros, por ejemplo). */
export function formatDecimal(value: number, locale: Locale): string {
  return decimal(locale).format(value);
}

export function formatMoney(value: string | number | null | undefined, locale: Locale, currency = 'USD'): string {
  const amount = typeof value === 'number' ? value : Number(value ?? '0');
  if (!Number.isFinite(amount)) {
    return '—';
  }
  return cached(
    `cur:${locale}:${currency}`,
    () => new Intl.NumberFormat(INTL_LOCALE[locale], { style: 'currency', currency, maximumFractionDigits: 2 }),
  ).format(amount);
}

/** Importe en artacoins: entero con los miles del idioma (la unidad no se traduce). */
export function formatArtacoins(value: string | number | null | undefined, locale: Locale): string {
  const amount = typeof value === 'number' ? value : Number(value ?? '0');
  if (!Number.isFinite(amount)) {
    return '—';
  }
  return `${formatInteger(amount, locale)} artacoins`;
}
