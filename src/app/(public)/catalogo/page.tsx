import type { Metadata } from 'next';
import { getPublicLots } from '@/lib/api/server';
import { CatalogBrowser } from './catalog-browser';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Catálogo' };

export default async function CatalogPage() {
  const { lots, error } = await getPublicLots();
  return (
    <section>
      <header className="mb-8">
        <h1 className="font-serif text-4xl">Catálogo</h1>
        <p className="mt-2 text-muted">Se regenera cada minuto. El filtro corre en un worker, no en el hilo de la página.</p>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      <CatalogBrowser lots={lots} />
    </section>
  );
}
