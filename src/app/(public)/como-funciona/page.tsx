import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/layout';

export const metadata: Metadata = { title: 'Cómo funciona' };

const SECTIONS = [
  {
    title: 'Auditoría de autenticidad',
    paragraphs: [
      'Cada obra publicada pasa por una auditoría: reglas que detectan anacronismos (por ejemplo, acrílico antes de 1950) o imágenes repetidas, y un modelo que evalúa la ficha completa.',
      'Si todo cuadra, la obra se publica con un puntaje de autenticidad y un precio sugerido. Si algo no encaja, queda en revisión manual y la decide una persona.',
    ],
  },
  {
    title: 'Salas de subasta',
    paragraphs: [
      'Siempre hay algunas salas abiertas o por abrir: cada pocos minutos una obra del catálogo sale a subasta y la sala dura entre 15 y 30 minutos.',
      'El precio solo sube. Si alguien puja en los últimos 30 segundos, el cierre se alarga otros 30. Puedes retirar tu oferta hasta 4 minutos antes del cierre.',
      'La cuenta regresiva usa el reloj del servidor, así que todas las personas ven el mismo tiempo.',
    ],
  },
  {
    title: 'Artacoins y bolsillo',
    paragraphs: [
      'Las pujas se pagan en artacoins. Se recargan en el bolsillo con un cobro simulado: sirve cualquier tarjeta que no esté vencida.',
      'Al ofertar solo se retiene la diferencia con tu oferta anterior. Si pierdes, lo retenido vuelve; si ganas, se cobra, y quien vende recibe el precio menos el 10 % de comisión.',
    ],
  },
  {
    title: 'Tu galería 3D',
    paragraphs: [
      'Las obras que ganas cuelgan en tu sala 3D. Puedes recorrerla a pie, acercarte a cada obra y montarla a tu gusto: paredes, suelo, luz y la posición de cada pieza.',
      'Las obras públicas también se ven en tu galería pública, y otras personas pueden seguirte.',
    ],
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="Guía" title="Cómo funciona la sala" description="De la auditoría a tu galería: todo lo que pasa con una obra en ArtAuction." />
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {SECTIONS.map((section, index) => (
          <section key={section.title}>
            <p className="font-serif text-4xl text-oxide/40">{String(index + 1).padStart(2, '0')}</p>
            <h2 className="mt-1 font-serif text-2xl">{section.title}</h2>
            <div className="mt-3 space-y-3 leading-relaxed text-muted">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink href="/catalogo" variant="accent">
          Ver salas en vivo
        </ButtonLink>
        <ButtonLink href="/registro" variant="secondary">
          Crear cuenta
        </ButtonLink>
      </div>
    </>
  );
}
