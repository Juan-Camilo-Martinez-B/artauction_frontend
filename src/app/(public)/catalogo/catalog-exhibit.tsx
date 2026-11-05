import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArtworkImage } from '@/components/artwork-image';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/layout';
import { useCategoryName } from '@/hooks/use-category-name';
import { catalogHref } from '@/lib/catalog-href';
import { CatalogSearch } from './catalog-search';
import type { Category, Lot } from '@/lib/api/types';

export function CatalogExhibit({
  lots,
  categories,
  activeCategory,
  query,
  representation,
  total,
  page,
  pageSize,
}: {
  lots: Lot[];
  categories: Category[];
  activeCategory: string;
  query: string;
  representation: string;
  total: number;
  page: number;
  pageSize: number;
}) {
  const t = useTranslations('Catalog');
  const categoryName = useCategoryName();
  const featured = [...lots].sort((left, right) => (right.authenticityScore ?? 0) - (left.authenticityScore ?? 0))[0];
  const rest = lots.filter((lot) => lot.id !== featured?.id);

  return (
    <div>
      <CatalogSearch key={query} query={query} representation={representation} category={activeCategory} />
      <nav aria-label={t('categories')} className="mb-8 flex flex-wrap gap-2">
        <CategoryLink href={catalogHref({ query, representation })} active={!activeCategory} label={t('allCatalog')} />
        {categories.map((category) => (
          <CategoryLink
            key={category.slug}
            href={catalogHref({ category: category.slug, query, representation })}
            active={activeCategory === category.slug}
            label={categoryName(category) ?? category.name}
          />
        ))}
      </nav>
      {lots.length === 0 ? (
        <EmptyState
          icon={<SearchX aria-hidden="true" className="h-6 w-6" />}
          title={t('empty.title')}
          description={t('empty.description')}
          action={<ButtonLink href="/catalogo" variant="secondary">{t('empty.action')}</ButtonLink>}
        />
      ) : null}
      {featured ? (
        <article className="mb-10 grid gap-6 border-y border-line py-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <WorkSurface lot={featured} featured />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-oxide">{t('featured')}</p>
            <h2 className="mt-2 font-serif text-4xl">
              <Link href={`/obras/${featured.id}`}>{featured.title}</Link>
            </h2>
            <p className="mt-2 text-muted">{featured.artistName ?? t('unattributedArtist')}</p>
            <p className="mt-4 max-w-md">{featured.description}</p>
          </div>
        </article>
      ) : null}
      <div className="columns-1 gap-4 md:columns-2 lg:columns-3">
        {rest.map((lot) => (
          <article key={lot.id} className="mb-4 break-inside-avoid">
            <WorkSurface lot={lot} />
            <h2 className="mt-3 font-serif text-2xl leading-tight">
              <Link href={`/obras/${lot.id}`}>{lot.title}</Link>
            </h2>
            <p className="text-sm text-muted">
              {categoryName(primaryCategory(lot)) ?? t('noCategory')} · {lot.artistName ?? t('unattributed')}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted">{t('total', { total })}</p>
      <CatalogPager page={page} pageSize={pageSize} total={total} query={query} category={activeCategory} representation={representation} />
    </div>
  );
}

function CategoryLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${active ? 'bg-ink text-paper' : 'border border-line-strong hover:border-ink'}`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  );
}

function WorkSurface({ lot, featured = false }: { lot: Lot; featured?: boolean }) {
  const t = useTranslations('Catalog');
  const categoryName = useCategoryName();
  const threeD = lot.representationKind === 'THREE_D';
  const primary = categoryName(primaryCategory(lot));
  return (
    <Link
      href={`/obras/${lot.id}`}
      className="relative block w-full overflow-hidden rounded-panel border border-line bg-paper-deep shadow-panel transition-shadow hover:shadow-lift"
      aria-label={lot.title}
    >
      <ArtworkImage src={lot.images?.[0]?.url ?? null} alt="" featured={featured} />
      {threeD && !lot.images?.[0]?.url ? <span className="absolute bottom-8 left-1/2 h-16 w-10 -translate-x-1/2 bg-ink/80" aria-hidden="true" /> : null}
      <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider">
        {threeD ? t('object') : t('wallWork')}
        {primary ? ` · ${primary}` : ''}
      </span>
    </Link>
  );
}

function primaryCategory(lot: Lot) {
  return lot.categories?.find((link) => link.isPrimary)?.category;
}

function CatalogPager({
  page,
  pageSize,
  total,
  query,
  category,
  representation,
}: {
  page: number;
  pageSize: number;
  total: number;
  query: string;
  category: string;
  representation: string;
}) {
  const t = useTranslations('Catalog.pager');
  const pages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
  if (pages <= 1) {
    return null;
  }
  return (
    <nav aria-label={t('label')} className="mt-4 flex items-center gap-3 text-sm">
      {page > 1 ? (
        <ButtonLink href={catalogHref({ category, query, representation, page: page - 1 })} variant="secondary" size="sm" icon={<ChevronLeft aria-hidden="true" className="h-4 w-4" />}>
          {t('previous')}
        </ButtonLink>
      ) : null}
      <span className="text-muted">
        {t('page', { page, pages })}
      </span>
      {page < pages ? (
        <ButtonLink href={catalogHref({ category, query, representation, page: page + 1 })} variant="secondary" size="sm">
          {t('next')}
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </ButtonLink>
      ) : null}
    </nav>
  );
}
