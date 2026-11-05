import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import type { Locale } from '@/i18n/locales';
import english from '@/i18n/messages/en.json';
import spanish from '@/i18n/messages/es.json';

const MESSAGES = { es: spanish, en: english } as const;

/** Proveedor de next-intl para las pruebas; espanol por omision, como la plataforma. */
export function IntlWrapper({ children, locale = 'es' }: { children: ReactNode; locale?: Locale }) {
  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="America/Bogota">
      {children}
    </NextIntlClientProvider>
  );
}

/** render de Testing Library con los diccionarios cargados. */
export function renderWithIntl(ui: ReactElement, { locale = 'es', ...options }: RenderOptions & { locale?: Locale } = {}) {
  return render(ui, {
    ...options,
    wrapper: ({ children }) => <IntlWrapper locale={locale}>{children}</IntlWrapper>,
  });
}
