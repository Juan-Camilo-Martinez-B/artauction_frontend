import type { Locale } from './locales';
import type { Messages } from './messages';

// Tipa las claves de los diccionarios y el idioma en useTranslations/getTranslations:
// una clave que no existe en espanol no compila.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
