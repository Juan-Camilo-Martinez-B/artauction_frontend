import { describe, expect, it } from 'vitest';
import english from '@/i18n/messages/en.json';
import spanish from '@/i18n/messages/es.json';
import { localeCookie, localeFromCookies, negotiateLocale } from '@/i18n/locales';
import { errorText } from '@/lib/api/error-text';
import { formatInteger } from '@/lib/format';
import { STEPS } from '@/lib/gallery/steps';

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

describe('cuestionario de la galeria', () => {
  it('cada paso, pregunta y opcion tiene texto en los dos idiomas', () => {
    for (const dictionary of [spanish, english]) {
      const wizard = dictionary.GalleryWizard as unknown as {
        steps: Record<string, string>;
        questions: Record<string, { prompt: string; options: Record<string, string> }>;
      };
      for (const step of STEPS) {
        expect(wizard.steps[step.id]).toBeTruthy();
        for (const question of step.questions) {
          expect(wizard.questions[question.key]?.prompt).toBeTruthy();
          for (const option of question.options) {
            expect({ option, text: Boolean(wizard.questions[question.key]?.options[option]) }).toEqual({ option, text: true });
          }
        }
      }
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

describe('texto de los errores del backend', () => {
  const dictionary: Record<string, string> = {
    INSUFFICIENT_FUNDS: 'Missing {missing}',
    NOT_FOUND: 'Not found',
    VALIDATION_FAILED: 'Check the data',
  };
  const t = Object.assign(
    (key: string, values: Record<string, string> = {}) =>
      (dictionary[key] ?? key).replace(/\{(\w+)\}/g, (_match, name: string) => values[name] ?? ''),
    { has: (key: string) => key in dictionary },
  );
  const error = (code: string | null, message = 'Mensaje del servidor') => ({ code, message, params: { missing: '40' } });

  it('un codigo especifico siempre sale del diccionario, con sus parametros', () => {
    expect(errorText(error('INSUFFICIENT_FUNDS'), 'es', t, 'fallo')).toBe('Missing 40');
    expect(errorText(error('VALIDATION_FAILED'), 'es', t, 'fallo')).toBe('Check the data');
  });

  it('con un codigo generico, en espanol vale el mensaje del servidor y en ingles el texto generico', () => {
    expect(errorText(error('NOT_FOUND'), 'es', t, 'fallo')).toBe('Mensaje del servidor');
    expect(errorText(error('NOT_FOUND'), 'en', t, 'fallo')).toBe('Not found');
  });

  it('sin codigo conocido o sin error, usa el texto de la accion', () => {
    expect(errorText(error('ALGO_NUEVO'), 'en', t, 'Could not save')).toBe('Could not save');
    expect(errorText(null, 'es', t, 'No se pudo guardar')).toBe('No se pudo guardar');
  });
});
