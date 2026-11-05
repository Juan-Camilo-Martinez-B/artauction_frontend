import { ArrowRight, Box, Gavel, ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LiveAuctions } from '@/components/auctions/live-auctions';
import { ButtonLink } from '@/components/ui/button';

const STEPS = [
  { Icon: ShieldCheck, id: 'audit' },
  { Icon: Gavel, id: 'auction' },
  { Icon: Box, id: 'exhibit' },
] as const;

export default async function HomePage() {
  const t = await getTranslations('Home');
  return (
    <>
      <section className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-oxide">{t('eyebrow')}</p>
          <h1 className="mt-3 font-serif text-5xl leading-tight md:text-6xl">{t('title')}</h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            {t('lead')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/catalogo" variant="accent">
              {t('toCatalog')}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/como-funciona" variant="secondary">
              {t('howItWorks')}
            </ButtonLink>
          </div>
        </div>
        <ol className="space-y-4 rounded-panel border border-line bg-surface p-6 shadow-panel">
          {STEPS.map(({ Icon, id }, index) => (
            <li key={id} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-deep text-oxide">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span>
                <strong className="block font-serif text-xl">
                  {index + 1}. {t(`steps.${id}.title`)}
                </strong>
                <span className="text-sm text-muted">{t(`steps.${id}.text`)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <LiveAuctions showCatalogLink />
    </>
  );
}
