import type { Metadata } from 'next';
import { Fraunces, Source_Sans_3 } from 'next/font/google';
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
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-white focus:px-3 focus:py-2">
          Saltar al contenido
        </a>
        <main id="contenido" className="mx-auto max-w-6xl px-4 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
