import { useTranslations } from 'next-intl';
import { BRANDS, type CardBrand } from '@/lib/payments/card';

/** Muestra el numero con huecos donde faltan digitos, respetando la agrupacion de la marca. */
function maskedNumber(number: string, brand: CardBrand): string {
  const digits = number.replace(/\D+/g, '');
  const groups: string[] = [];
  let start = 0;
  for (const size of BRANDS[brand].groups) {
    groups.push(digits.slice(start, start + size).padEnd(size, '•'));
    start += size;
  }
  return groups.join(' ');
}

/**
 * Tarjeta decorativa que refleja lo escrito. Se oculta a lectores de pantalla:
 * la misma informacion ya esta en los campos del formulario.
 */
export function CardPreview({ brand, number, name, expiry }: { brand: CardBrand; number: string; name: string; expiry: string }) {
  const t = useTranslations('Card');
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[1.586] w-full max-w-sm overflow-hidden rounded-panel bg-gradient-to-br from-ink via-ink-soft to-oxide-deep p-6 text-paper shadow-lift"
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-oxide/30 blur-2xl" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="h-8 w-11 rounded-md bg-gradient-to-br from-ochre-tint to-ochre" />
          <span className="text-sm font-medium tracking-wide">{BRANDS[brand].label || t('genericBrand')}</span>
        </div>
        <p className="whitespace-nowrap font-mono text-base tracking-[0.08em]">{maskedNumber(number, brand)}</p>
        <div className="flex items-end justify-between gap-4 text-xs uppercase tracking-wider">
          <span className="truncate">{name || t('namePlaceholder')}</span>
          <span className="shrink-0">{expiry || t('expiryPlaceholder')}</span>
        </div>
      </div>
    </div>
  );
}
