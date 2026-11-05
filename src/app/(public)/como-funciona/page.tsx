import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/layout';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('HowItWorks');
  return { title: t('metaTitle') };
}

// Cada seccion y cuantos parrafos tiene en el diccionario HowItWorks.
const SECTIONS = [
  { id: 'audit', paragraphs: 2 },
  { id: 'rooms', paragraphs: 3 },
  { id: 'wallet', paragraphs: 2 },
  { id: 'gallery', paragraphs: 2 },
] as const;

export default async function AboutPage() {
  const t = await getTranslations('HowItWorks');
  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {SECTIONS.map((section, index) => (
          <section key={section.id}>
            <p className="font-serif text-4xl text-oxide/40">{String(index + 1).padStart(2, '0')}</p>
            <h2 className="mt-1 font-serif text-2xl">{t(`sections.${section.id}.title`)}</h2>
            <div className="mt-3 space-y-3 leading-relaxed text-muted">
              {Array.from({ length: section.paragraphs }, (_value, paragraph) => (
                <p key={paragraph}>{t(`sections.${section.id}.p${String(paragraph + 1)}` as Parameters<typeof t>[0])}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink href="/catalogo" variant="accent">
          {t('toLive')}
        </ButtonLink>
        <ButtonLink href="/registro" variant="secondary">
          {t('createAccount')}
        </ButtonLink>
      </div>
    </>
  );
}
