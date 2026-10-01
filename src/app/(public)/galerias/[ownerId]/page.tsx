import type { Metadata } from 'next';
import { getPublicGallery } from '@/lib/api/server';
import { FollowButton } from './follow-button';

export const revalidate = 60;
export const dynamicParams = true;
export const metadata: Metadata = { title: 'Galería' };

export function generateStaticParams(): { ownerId: string }[] {
  return [];
}

export default async function PublicGalleryPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params;
  const items = await getPublicGallery(ownerId);
  return (
    <section>
      <h1 className="font-serif text-4xl">Galería pública</h1>
      <FollowButton ownerId={ownerId} />
      {items.length === 0 ? <p className="mt-6">No hay piezas públicas.</p> : null}
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <li key={`${item.title}-${item.acquiredAt}`} className="rounded-xl border border-line bg-white p-4">
            <h2 className="font-serif text-2xl">{item.title}</h2>
            <p className="text-sm text-muted">{item.artistName ?? 'Sin atribuir'}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
