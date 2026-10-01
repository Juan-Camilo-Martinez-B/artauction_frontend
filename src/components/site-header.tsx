import Link from 'next/link';
import { SessionNav } from './session-nav';

const links = [
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/como-funciona', label: 'Cómo funciona' },
];

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
        <Link href="/" className="font-serif text-xl tracking-tight">
          ArtAuction
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-5 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted hover:text-ink">
              {link.label}
            </Link>
          ))}
          <SessionNav />
        </nav>
      </div>
    </header>
  );
}
