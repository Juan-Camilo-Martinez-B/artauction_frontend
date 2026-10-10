import Link from 'next/link';
import type { Category, Lot } from '@/lib/api/types';

export function CatalogExhibit({
  lots,
  categories,
  activeCategory,
  query,
  representation,
  total,
}: {
  lots: Lot[];
  categories: Category[];
  activeCategory: string;
  query: string;
  representation: string;
  total: number;
}) {
  const featured = [...lots].sort((left, right) => (right.authenticityScore ?? 0) - (left.authenticityScore ?? 0))[0];
  const rest = lots.filter((lot) => lot.id !== featured?.id);

  return (
    <div>
      <form className="mb-8 grid gap-3 md:grid-cols-[1fr_12rem]" action="/catalogo" role="search">
        {activeCategory ? <input type="hidden" name="category" value={activeCategory} /> : null}
        <label className="text-sm">
          <span className="mb-1 block">Buscar obra, artista o material</span>
          <input
            name="q"
            defaultValue={query}
            className="w-full rounded-md border border-line bg-white px-3 py-2"
            placeholder="Retrato, óleo, Vásquez…"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block">Formato</span>
          <select name="representation" defaultValue={representation} className="w-full rounded-md border border-line bg-white px-3 py-2">
            <option value="">Todos</option>
            <option value="TWO_D">Bidimensional</option>
            <option value="THREE_D">Tridimensional</option>
          </select>
        </label>
      </form>
      <nav aria-label="Categorías" className="mb-8 flex flex-wrap gap-2">
        <CategoryLink href={hrefFor('', query, representation)} active={!activeCategory} label="Todo el catálogo" />
        {categories.map((category) => (
          <CategoryLink
            key={category.slug}
            href={hrefFor(category.slug, query, representation)}
            active={activeCategory === category.slug}
            label={category.name}
          />
        ))}
      </nav>
      {lots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-6 py-16 text-center text-muted">
          No hay obras con ese criterio. Prueba otra categoría o borra la búsqueda.
        </p>
      ) : null}
      {featured ? (
        <article className="mb-10 grid gap-6 border-y border-line py-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <WorkSurface lot={featured} featured />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-oxide">Obra destacada</p>
            <h2 className="mt-2 font-serif text-4xl">
              <Link href={`/obras/${featured.id}`}>{featured.title}</Link>
            </h2>
            <p className="mt-2 text-muted">{featured.artistName ?? 'Artista sin atribuir'}</p>
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
              {featuredLabel(lot)} · {lot.artistName ?? 'Sin atribuir'}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted">{total} obras en esta selección.</p>
    </div>
  );
}

function CategoryLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={active ? 'rounded-full bg-ink px-3 py-1 text-sm text-paper' : 'rounded-full border border-line px-3 py-1 text-sm'}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  );
}

function WorkSurface({ lot, featured = false }: { lot: Lot; featured?: boolean }) {
  const threeD = lot.representationKind === 'THREE_D';
  const primary = lot.categories?.find((link) => link.isPrimary)?.category.name;
  return (
    <Link
      href={`/obras/${lot.id}`}
      className={`relative block overflow-hidden bg-white ${featured ? 'min-h-72' : threeD ? 'aspect-square' : 'aspect-[3/4]'}`}
      aria-label={lot.title}
    >
      <span
        className="absolute inset-6 border border-line"
        style={{ background: threeD ? 'radial-gradient(circle at 50% 70%, #efe6d6, #d8d0c2 70%)' : 'linear-gradient(160deg, #f7f1e6, #e4d5c3)' }}
      />
      {threeD ? <span className="absolute bottom-8 left-1/2 h-16 w-10 -translate-x-1/2 bg-ink/80" aria-hidden="true" /> : null}
      <span className="absolute left-3 top-3 bg-paper/90 px-2 py-1 text-[10px] uppercase tracking-wider">
        {threeD ? 'Objeto' : 'Obra mural'}
        {primary ? ` · ${primary}` : ''}
      </span>
    </Link>
  );
}

function featuredLabel(lot: Lot): string {
  return lot.categories?.find((link) => link.isPrimary)?.category.name ?? 'Sin categoría';
}

function hrefFor(category: string, query: string, representation: string): string {
  const params = new URLSearchParams();
  if (category) {
    params.set('category', category);
  }
  if (query) {
    params.set('q', query);
  }
  if (representation) {
    params.set('representation', representation);
  }
  const text = params.toString();
  return text ? `/catalogo?${text}` : '/catalogo';
}
