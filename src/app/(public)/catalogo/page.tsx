import type { Metadata } from 'next';
import { LiveAuctions } from '@/components/auctions/live-auctions';
import { PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { getCategories, getPublicLots } from '@/lib/api/server';
import { CatalogExhibit } from './catalog-exhibit';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Catálogo' };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = first(params['q']);
  const category = first(params['category']);
  const representation = first(params['representation']);
  const page = Math.max(1, Number(first(params['page'])) || 1);
  const pageSize = 60;
  const search = new URLSearchParams();
  if (query) {
    search.set('q', query);
  }
  if (category) {
    search.set('category', category);
  }
  if (representation) {
    search.set('representation', representation);
  }
  search.set('page', String(page));
  search.set('pageSize', String(pageSize));
  const suffix = search.size > 0 ? `?${search.toString()}` : '';
  const [{ catalog, error }, categories] = await Promise.all([getPublicLots(suffix), getCategories()]);

  return (
    <section>
      <PageHeader
        eyebrow="Exposición"
        title="Catálogo"
        description="Pinturas, fotografías y objetos con auditoría de autenticidad. Cada pocos minutos una obra sale a subasta."
      />
      <LiveAuctions />
      {error ? <Notice tone="error" className="mb-6">{error}</Notice> : null}
      <CatalogExhibit
        lots={catalog.items}
        categories={categories}
        activeCategory={category}
        query={query}
        representation={representation}
        total={catalog.total}
        page={catalog.page}
        pageSize={catalog.pageSize}
      />
    </section>
  );
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
