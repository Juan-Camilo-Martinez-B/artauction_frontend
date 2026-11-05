// Reglas de forma de las tarjetas que circulan en Colombia. Son espejo de
// wallet-service (domain/card.ts): el cobro es simulado y solo se exige que el
// numero tenga la longitud de su marca, el CVV su largo y que no este vencida.

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'diners' | 'otra';

export interface BrandSpec {
  label: string;
  digits: number;
  cvvDigits: number;
  /** Tamano de cada grupo al mostrar el numero, como viene impreso en la tarjeta. */
  groups: readonly number[];
}

export const BRANDS: Record<CardBrand, BrandSpec> = {
  visa: { label: 'Visa', digits: 16, cvvDigits: 3, groups: [4, 4, 4, 4] },
  mastercard: { label: 'Mastercard', digits: 16, cvvDigits: 3, groups: [4, 4, 4, 4] },
  amex: { label: 'American Express', digits: 15, cvvDigits: 4, groups: [4, 6, 5] },
  diners: { label: 'Diners Club', digits: 14, cvvDigits: 3, groups: [4, 6, 4] },
  // Sin marca reconocida: la etiqueta se traduce en la interfaz (Card.genericBrand).
  otra: { label: '', digits: 16, cvvDigits: 3, groups: [4, 4, 4, 4] },
};

/** Cuantos anos hacia adelante se acepta una fecha de vencimiento. */
const MAX_YEARS_AHEAD = 20;

export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

export function detectBrand(digits: string): CardBrand {
  if (/^3[47]/.test(digits)) {
    return 'amex';
  }
  if (/^3(?:0[0-5]|[68])/.test(digits)) {
    return 'diners';
  }
  if (digits.startsWith('4')) {
    return 'visa';
  }
  if (/^5[1-5]/.test(digits) || /^2(?:2[2-9]|[3-6]\d|7[01]|720)/.test(digits)) {
    return 'mastercard';
  }
  return 'otra';
}

/** Deja solo digitos, corta en la longitud de la marca y agrupa con espacios. */
export function formatCardNumber(raw: string): string {
  const digits = onlyDigits(raw);
  const spec = BRANDS[detectBrand(digits)];
  const kept = digits.slice(0, spec.digits);
  const parts: string[] = [];
  let start = 0;
  for (const size of spec.groups) {
    if (start >= kept.length) {
      break;
    }
    parts.push(kept.slice(start, start + size));
    start += size;
  }
  return parts.join(' ');
}

/** Lleva lo escrito a la forma MM/AA. Un primer digito de 2 a 9 se entiende como mes 02 a 09. */
export function formatExpiry(raw: string): string {
  let digits = onlyDigits(raw).slice(0, 4);
  if (/^[2-9]$/.test(digits.charAt(0))) {
    digits = `0${digits}`.slice(0, 4);
  }
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function formatCvv(raw: string, brand: CardBrand): string {
  return onlyDigits(raw).slice(0, BRANDS[brand].cvvDigits);
}

/** Nombre como viene impreso: letras y espacios, sin espacios al inicio ni dobles. */
export function formatCardName(raw: string): string {
  return raw
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+/g, '')
    .replace(/^\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .toUpperCase()
    .slice(0, 26);
}

export function parseExpiry(value: string): { month: number; year: number } | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return { month: Number(match[1]), year: 2000 + Number(match[2]) };
}

/**
 * Problemas de los campos de la tarjeta. Son claves del diccionario Card: el
 * componente pone el texto (y la marca o los digitos que correspondan).
 */
export type CardProblem =
  | 'numberRequired'
  | 'numberLength'
  | 'expiryRequired'
  | 'expiryFormat'
  | 'expiryMonth'
  | 'expired'
  | 'expiryYear'
  | 'cvvLength'
  | 'nameRequired';

export function cardNumberError(value: string): CardProblem | undefined {
  const digits = onlyDigits(value);
  if (digits === '') {
    return 'numberRequired';
  }
  const spec = BRANDS[detectBrand(digits)];
  if (digits.length !== spec.digits) {
    return 'numberLength';
  }
  return undefined;
}

export function expiryError(value: string, now: Date = new Date()): CardProblem | undefined {
  if (value === '') {
    return 'expiryRequired';
  }
  const parsed = parseExpiry(value);
  if (!parsed) {
    return 'expiryFormat';
  }
  if (parsed.month < 1 || parsed.month > 12) {
    return 'expiryMonth';
  }
  const current = now.getFullYear() * 12 + now.getMonth() + 1;
  const expiry = parsed.year * 12 + parsed.month;
  if (expiry < current) {
    return 'expired';
  }
  if (parsed.year > now.getFullYear() + MAX_YEARS_AHEAD) {
    return 'expiryYear';
  }
  return undefined;
}

export function cvvError(value: string, brand: CardBrand): CardProblem | undefined {
  return value.length !== BRANDS[brand].cvvDigits ? 'cvvLength' : undefined;
}

export function cardNameError(value: string): CardProblem | undefined {
  return value.trim().length < 3 ? 'nameRequired' : undefined;
}
