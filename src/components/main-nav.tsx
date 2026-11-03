'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const LINKS = [
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/mi-galeria', label: 'Mi galería' },
  { href: '/como-funciona', label: 'Cómo funciona' },
];

/** Una seccion esta activa en su ruta y en sus subrutas (por ejemplo, /mi-galeria/personalizar). */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Enlaces principales: en linea desde md, y en un menu desplegable en pantallas chicas. */
export function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Al navegar, el menu movil se cierra.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const linkClass = (href: string) =>
    isActive(pathname, href)
      ? 'text-ink font-medium underline decoration-oxide decoration-2 underline-offset-8'
      : 'text-muted hover:text-ink';

  return (
    <>
      <ul className="hidden items-center gap-6 text-sm md:flex">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={linkClass(link.href)} aria-current={isActive(pathname, link.href) ? 'page' : undefined}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="rounded-full p-2 text-ink hover:bg-paper-deep md:hidden"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? 'Cerrar el menú' : 'Abrir el menú'}
        onClick={() => { setOpen((current) => !current); }}
      >
        {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
      </button>
      {open ? (
        <ul id="mobile-nav" className="absolute inset-x-0 top-full z-30 border-b border-line bg-paper px-4 py-3 shadow-panel md:hidden">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block rounded-field px-3 py-2.5 ${isActive(pathname, link.href) ? 'bg-paper-deep font-medium text-ink' : 'text-ink'}`}
                aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
