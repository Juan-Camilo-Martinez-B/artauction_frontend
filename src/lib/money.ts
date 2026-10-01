export function formatMoney(value: string | number | null | undefined, currency = 'USD'): string {
  const amount = typeof value === 'number' ? value : Number(value ?? '0');
  if (!Number.isFinite(amount)) {
    return '—';
  }
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}
