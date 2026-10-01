import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-end">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-oxide">Sala de arte</p>
        <h1 className="mt-3 font-serif text-5xl leading-tight md:text-6xl">La obra entra cuando el material y el siglo coinciden.</h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          Cada lote pasa por una auditoría antes de la sala. El precio solo sube, el cierre se alarga si alguien puja en el último instante y el reloj que ves es el del servidor.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/catalogo" className="rounded-full bg-oxide px-5 py-2 text-white">
            Ver catálogo
          </Link>
          <Link href="/como-funciona" className="rounded-full border border-line px-5 py-2">
            Cómo funciona
          </Link>
        </div>
      </div>
      <aside className="rounded-2xl border border-line bg-white p-6">
        <ol className="space-y-4 text-sm">
          <li>
            <strong className="block font-serif text-xl">1. Publicas</strong>
            La imagen se prepara en tu navegador antes de salir.
          </li>
          <li>
            <strong className="block font-serif text-xl">2. Auditamos</strong>
            Un anacronismo grave deja la obra en revisión, no en la sala.
          </li>
          <li>
            <strong className="block font-serif text-xl">3. Subastas</strong>
            La puja ganadora queda en la galería de quien se la llevó.
          </li>
        </ol>
      </aside>
    </section>
  );
}
