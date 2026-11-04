import { describe, expect, it } from 'vitest';
import english from '@/i18n/messages/en.json';
import spanish from '@/i18n/messages/es.json';
import { localeCookie, localeFromCookies, negotiateLocale } from '@/i18n/locales';
import { formatInteger } from '@/lib/format';

type Tree = { [key: string]: string | Tree };

/** Cada texto con su ruta completa, por ejemplo "Account.signIn". */
function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      entries.set(path, value);
    } else {
      for (const [nested, text] of flatten(value, path)) {
        entries.set(nested, text);
      }
    }
  }
  return entries;
}

/** Marcadores ICU de un texto: {name}, {held}... */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)/g)].map((match) => match[1] ?? '').sort();
}

describe('diccionarios', () => {
  const es = flatten(spanish);
  const en = flatten(english);

  it('espanol e ingles tienen exactamente las mismas claves', () => {
    expect([...en.keys()].sort()).toEqual([...es.keys()].sort());
  });

  it('cada texto usa los mismos marcadores en los dos idiomas y ninguno esta vacio', () => {
    for (const [key, text] of es) {
      expect({ key, placeholders: placeholders(en.get(key) ?? '') }).toEqual({ key, placeholders: placeholders(text) });
      expect({ key, empty: text.trim() === '' || (en.get(key) ?? '').trim() === '' }).toEqual({ key, empty: false });
    }
  });
});

describe('idioma pedido', () => {
  it('toma el idioma del navegador de mayor peso y cae en espanol', () => {
    expect(negotiateLocale('en-US,en;q=0.9')).toBe('en');
    expect(negotiateLocale('fr-FR,en;q=0.5,es;q=0.8')).toBe('es');
    expect(negotiateLocale('de,fr')).toBe('es');
    expect(negotiateLocale(null)).toBe('es');
    expect(negotiateLocale('en;q=0,es;q=0.1')).toBe('es');
  });

  it('la cookie recuerda el idioma y se ignora un valor desconocido', () => {
    expect(localeCookie('en')).toMatch(/^NEXT_LOCALE=en; Path=\/; Max-Age=\d+; SameSite=Lax$/);
    expect(localeFromCookies('a=1; NEXT_LOCALE=en; b=2')).toBe('en');
    expect(localeFromCookies('NEXT_LOCALE=fr')).toBeNull();
    expect(localeFromCookies('')).toBeNull();
  });

  it('los miles se separan segun el idioma', () => {
    expect(formatInteger(12345, 'es')).toBe('12.345');
    expect(formatInteger(12345, 'en')).toBe('12,345');
  });
});
