import { Images } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, PageHeader } from '@/components/ui/layout';
import { getPublicGallery } from '@/lib/api/server';
import { FollowButton } from './follow-button';

export const revalidate = 60;
export const dynamicParams = true;
export const metadata: Metadata = { title: 'Galería' };

export function generateStaticParams(): { ownerId: string }[] {
  return [];
}

const SOURCE_LABEL: Record<string, string> = {
  GANADA: 'Ganada en subasta',
  PROPIA: 'De su autoría',
  GRATUITA: 'En exhibición',
};

export default async function PublicGalleryPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params;
  const items = await getPublicGallery(ownerId);
  return (
    <>
      <PageHeader
        eyebrow="Colección"
        title="Galería pública"
        description="Las obras públicas de esta colección. Síguela para ver en tu feed lo que gana."
        actions={<FollowButton ownerId={ownerId} />}
      />
      {items.length === 0 ? (
        <EmptyState icon={<Images aria-hidden="true" className="h-6 w-6" />} title="Todavía no hay obras públicas" description="Cuando esta persona gane o publique obras públicas, se verán aquí." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={`${item.title}-${item.acquiredAt}`} className="rounded-panel border border-line bg-surface p-5 shadow-panel">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-oxide">{SOURCE_LABEL[item.source] ?? 'En la colección'}</p>
              <h2 className="mt-2 font-serif text-xl leading-snug">
                {item.lotId ? (
                  <Link href={`/obras/${item.lotId}`} className="hover:underline">
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </h2>
              <p className="text-sm text-muted">{item.artistName ?? 'Artista sin atribuir'}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
