import type { Metadata } from 'next';
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
  const suffix = search.size > 0 ? `?${search.toString()}` : '';
  const [{ catalog, error }, categories] = await Promise.all([getPublicLots(suffix), getCategories()]);

  return (
    <section>
      <header className="mb-8 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-oxide">Exposición</p>
        <h1 className="mt-2 font-serif text-5xl">Catálogo</h1>
        <p className="mt-3 text-muted">
          Una sala editorial de pinturas y objetos. El filtro vive en el servidor; la página se regenera cada minuto.
        </p>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      <CatalogExhibit
        lots={catalog.items}
        categories={categories}
        activeCategory={category}
        query={query}
        representation={representation}
        total={catalog.total}
      />
    </section>
  );
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
