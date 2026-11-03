// Fechas en un solo formato para todo el sitio (es-CO).

const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const relative = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' });

const STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
];

export function formatDateTime(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return Number.isNaN(date.getTime()) ? '' : dateTime.format(date);
}

/** "hace 5 minutos", "en 2 horas", "ayer"... respecto de `now`. */
export function formatRelative(iso: string | Date, now: Date = new Date()): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  let value = (date.getTime() - now.getTime()) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(value) < size) {
      return relative.format(Math.round(value), unit);
    }
    value /= size;
  }
  return dateTime.format(date);
}
