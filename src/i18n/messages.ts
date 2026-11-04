import type { Locale } from './locales';
import type spanish from './messages/es.json';

/** Forma de los diccionarios: la del espanol, que es la referencia. */
export type Messages = typeof spanish;

/** Solo se carga el diccionario del idioma pedido. */
export async function loadMessages(locale: Locale): Promise<Messages> {
  const loaded = (await import(`./messages/${locale}.json`)) as { default: Messages };
  return loaded.default;
}
