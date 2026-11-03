import type { Metadata } from 'next';
import { Fraunces, Source_Sans_3 } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif' });
const sans = Source_Sans_3({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: { default: 'ArtAuction AI', template: '%s · ArtAuction AI' },
  description: 'Subastas de arte y antigüedades con auditoría de autenticidad.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-field focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lift">
          Saltar al contenido
        </a>
        <ToastProvider>
          <SiteHeader />
          <main id="contenido" className="mx-auto max-w-6xl px-4 py-10">
            {children}
          </main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
