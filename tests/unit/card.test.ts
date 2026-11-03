import { describe, expect, it } from 'vitest';
import { transformWithCaret } from '@/lib/forms/sanitize';
import {
  cardNameError,
  cardNumberError,
  cvvError,
  detectBrand,
  expiryError,
  formatCardName,
  formatCardNumber,
  formatCvv,
  formatExpiry,
  parseExpiry,
} from '@/lib/payments/card';

const NOW = new Date(2026, 10, 2);

describe('número de tarjeta', () => {
  it('agrupa de a 4 las tarjetas de 16 dígitos y corta lo que sobra', () => {
    expect(formatCardNumber('4242424242424242999')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('5555 5555-5555 4444')).toBe('5555 5555 5555 4444');
    expect(formatCardNumber('12345')).toBe('1234 5');
  });

  it('usa la agrupación impresa de American Express y Diners', () => {
    expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
    expect(formatCardNumber('36227206271667')).toBe('3622 720627 1667');
  });

  it('ignora letras y signos', () => {
    expect(formatCardNumber('4a2b4c2')).toBe('4242');
  });

  it('detecta la marca por el prefijo', () => {
    expect(detectBrand('4')).toBe('visa');
    expect(detectBrand('51')).toBe('mastercard');
    expect(detectBrand('2221')).toBe('mastercard');
    expect(detectBrand('34')).toBe('amex');
    expect(detectBrand('300')).toBe('diners');
    expect(detectBrand('9')).toBe('otra');
  });

  it('exige la longitud de la marca', () => {
    expect(cardNumberError('')).toBe('Escribe el número de la tarjeta.');
    expect(cardNumberError('4242 4242')).toBe('Una tarjeta Visa tiene 16 dígitos.');
    expect(cardNumberError('3782 822463 1000')).toBe('Una tarjeta American Express tiene 15 dígitos.');
    expect(cardNumberError('1234 5678 9012 3456')).toBeUndefined();
  });

  it('deja el cursor después del dígito tecleado al saltar un espacio', () => {
    // Se teclea el quinto digito al final de "4242".
    expect(transformWithCaret('42424', 5, formatCardNumber)).toEqual({ value: '4242 4', caret: 6 });
  });
});

describe('vencimiento', () => {
  it('pone la barra sola y completa el mes de un dígito', () => {
    expect(formatExpiry('1')).toBe('1');
    expect(formatExpiry('12')).toBe('12');
    expect(formatExpiry('1230')).toBe('12/30');
    expect(formatExpiry('5')).toBe('05');
    expect(formatExpiry('0529')).toBe('05/29');
    expect(formatExpiry('12/309')).toBe('12/30');
  });

  it('no atrapa el borrado de la barra', () => {
    expect(formatExpiry('05/')).toBe('05');
  });

  it('acepta el mes en curso y rechaza el anterior', () => {
    expect(expiryError('11/26', NOW)).toBeUndefined();
    expect(expiryError('10/26', NOW)).toBe('La tarjeta está vencida.');
    expect(expiryError('01/20', NOW)).toBe('La tarjeta está vencida.');
  });

  it('explica los formatos inválidos', () => {
    expect(expiryError('', NOW)).toBe('Escribe el vencimiento.');
    expect(expiryError('12/3', NOW)).toBe('Escribe el vencimiento como MM/AA.');
    expect(expiryError('13/30', NOW)).toBe('El mes debe estar entre 01 y 12.');
    expect(expiryError('12/99', NOW)).toBe('Revisa el año de vencimiento.');
  });

  it('convierte MM/AA en mes y año completos', () => {
    expect(parseExpiry('07/31')).toEqual({ month: 7, year: 2031 });
    expect(parseExpiry('0731')).toBeNull();
  });
});

describe('código de seguridad y nombre', () => {
  it('limita el código al largo de la marca', () => {
    expect(formatCvv('12345', 'visa')).toBe('123');
    expect(formatCvv('12a345', 'amex')).toBe('1234');
    expect(cvvError('123', 'amex')).toBe('El código de seguridad tiene 4 dígitos.');
    expect(cvvError('123', 'visa')).toBeUndefined();
  });

  it('deja el nombre como viene impreso', () => {
    expect(formatCardName('  leo   vásquez 3')).toBe('LEO VÁSQUEZ ');
    expect(cardNameError('LE')).toBe('Escribe el nombre como aparece en la tarjeta.');
    expect(cardNameError('LEO')).toBeUndefined();
  });
});
