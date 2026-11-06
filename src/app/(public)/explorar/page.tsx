import { Compass } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { GalleryCard } from '@/components/social/gallery-card';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { getPublicGalleries } from '@/lib/api/server';
import { exploreHref, explorePages, EXPLORE_SORTS, parseExplorePage, parseExploreSort } from '@/lib/social/explore';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Explore');
  return { title: t('metaTitle') };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const sort = parseExploreSort(first(params['orden']));
  const page = parseExplorePage(first(params['pagina']));
  const [result, t] = await Promise.all([getPublicGalleries(page, sort), getTranslations('Explore')]);
  const pages = explorePages(result?.total ?? 0);
  const here = exploreHref(sort, page);

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <nav aria-label={t('sortLabel')} className="mb-6 flex flex-wrap gap-2">
        {EXPLORE_SORTS.map((option) => (
          <Link
            key={option}
            href={exploreHref(option)}
            aria-current={option === sort ? 'page' : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm ${option === sort ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-muted hover:text-ink'}`}
          >
            {t(`sort.${option}`)}
          </Link>
        ))}
      </nav>
      {result === null ? <Notice tone="error">{t('failed')}</Notice> : null}
      {result?.items.length === 0 ? (
        <EmptyState icon={<Compass aria-hidden="true" className="h-6 w-6" />} title={t('empty.title')} description={t('empty.description')} />
      ) : null}
      {result && result.items.length > 0 ? (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {result.items.map((gallery) => (
            <GalleryCard key={gallery.ownerId} gallery={gallery} returnTo={here} />
          ))}
        </ul>
      ) : null}
      {pages > 1 ? (
        <nav aria-label={t('pagination')} className="mt-8 flex items-center justify-between gap-4">
          {page > 1 ? (
            <ButtonLink href={exploreHref(sort, page - 1)} variant="secondary">
              {t('previous')}
            </ButtonLink>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted">{t('page', { page, pages })}</p>
          {page < pages ? (
            <ButtonLink href={exploreHref(sort, page + 1)} variant="secondary">
              {t('next')}
            </ButtonLink>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
