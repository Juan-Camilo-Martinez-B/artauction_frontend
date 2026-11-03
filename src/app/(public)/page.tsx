import { ArrowRight, Box, Gavel, ShieldCheck } from 'lucide-react';
import { LiveAuctions } from '@/components/auctions/live-auctions';
import { ButtonLink } from '@/components/ui/button';

const STEPS = [
  { Icon: ShieldCheck, title: 'Auditamos', text: 'Cada obra pasa una auditoría de autenticidad: material, época e imagen deben coincidir.' },
  { Icon: Gavel, title: 'Subastamos', text: 'Salas en vivo con el reloj del servidor. Una puja en el último instante alarga el cierre.' },
  { Icon: Box, title: 'Exhibes', text: 'La obra que ganas cuelga en tu galería 3D, que puedes recorrer y montar a tu gusto.' },
];

export default function HomePage() {
  return (
    <>
      <section className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-oxide">Sala de arte</p>
          <h1 className="mt-3 font-serif text-5xl leading-tight md:text-6xl">La obra entra cuando el material y el siglo coinciden.</h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            Subastas de arte y antigüedades con auditoría de autenticidad. El precio solo sube, el cierre se alarga si alguien puja en el último instante y lo que ganas se exhibe en tu propia sala.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/catalogo" variant="accent">
              Ver el catálogo
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/como-funciona" variant="secondary">
              Cómo funciona
            </ButtonLink>
          </div>
        </div>
        <ol className="space-y-4 rounded-panel border border-line bg-surface p-6 shadow-panel">
          {STEPS.map(({ Icon, title, text }, index) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-deep text-oxide">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span>
                <strong className="block font-serif text-xl">
                  {index + 1}. {title}
                </strong>
                <span className="text-sm text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <LiveAuctions showCatalogLink />
    </>
  );
}
