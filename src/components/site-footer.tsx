import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-serif text-lg text-ink">ArtAuction</p>
          <p className="mt-1 max-w-sm">Subastas de arte y antigüedades con auditoría de autenticidad. El reloj de cada sala es el del servidor.</p>
        </div>
        <ul className="space-y-1.5">
          <li><Link href="/catalogo" className="hover:text-ink">Catálogo y salas en vivo</Link></li>
          <li><Link href="/mi-galeria" className="hover:text-ink">Mi galería 3D</Link></li>
          <li><Link href="/como-funciona" className="hover:text-ink">Cómo funciona</Link></li>
        </ul>
        <ul className="space-y-1.5">
          <li><Link href="/bolsillo" className="hover:text-ink">Bolsillo de artacoins</Link></li>
          <li><Link href="/notificaciones" className="hover:text-ink">Avisos</Link></li>
          <li>Una obra privada no se muestra a terceros.</li>
        </ul>
      </div>
    </footer>
  );
}
