import { Images } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { EmptyState, PageHeader } from '@/components/ui/layout';
import { getPublicGallery } from '@/lib/api/server';
import { purchasedSheetHref } from '@/lib/artwork/sheet-href';
import { FollowButton } from './follow-button';

export const revalidate = 60;
export const dynamicParams = true;
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('PublicGallery');
  return { title: t('metaTitle') };
}

export function generateStaticParams(): { ownerId: string }[] {
  return [];
}

// Origen de cada obra; un proyecto propio no tiene auditoria y quien lo mira debe saberlo.
const SOURCES = ['GANADA', 'PROPIA', 'PROYECTO'] as const;

function isSource(value: string): value is (typeof SOURCES)[number] {
  return (SOURCES as readonly string[]).includes(value);
}

export default async function PublicGalleryPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params;
  const items = await getPublicGallery(ownerId);
  const t = await getTranslations('PublicGallery');
  return (
    <>
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        actions={<FollowButton ownerId={ownerId} />}
      />
      {items.length === 0 ? (
        <EmptyState icon={<Images aria-hidden="true" className="h-6 w-6" />} title={t('empty.title')} description={t('empty.description')} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={`${item.title}-${item.acquiredAt}`} className="rounded-panel border border-line bg-surface p-5 shadow-panel">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-oxide">{isSource(item.source) ? t(`sources.${item.source}`) : t('sources.other')}</p>
              <h2 className="mt-2 font-serif text-xl leading-snug">
                <Link href={item.source === 'GANADA' ? purchasedSheetHref(item.ownerId, item.lotId) : `/obras/${item.lotId}`} className="hover:underline">
                  {item.title}
                </Link>
              </h2>
              <p className="text-sm text-muted">{item.artistName ?? t('unattributedArtist')}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
