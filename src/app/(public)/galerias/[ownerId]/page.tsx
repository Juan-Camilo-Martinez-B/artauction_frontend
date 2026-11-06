import { ArrowLeft, Images } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProfileMark } from '@/components/account/profile-mark';
import { ArtworkImage } from '@/components/artwork-image';
import { GallerySocial } from '@/components/social/gallery-social';
import { EmptyState, PageHeader } from '@/components/ui/layout';
import { getGallerySummary, getPublicGallery } from '@/lib/api/server';
import { purchasedSheetHref } from '@/lib/artwork/sheet-href';
import { isGalleryOwnerId } from '@/lib/social/explore';

// La pagina depende del idioma de cada visita (cookie), asi que se renderiza por
// peticion. Declararla estatica hace que Next responda 500 en produccion.
export async function generateMetadata({ params }: { params: Promise<{ ownerId: string }> }): Promise<Metadata> {
  const { ownerId } = await params;
  const summary = isGalleryOwnerId(ownerId) ? await getGallerySummary(ownerId) : null;
  const t = await getTranslations('PublicGallery');
  return { title: summary?.displayName ?? t('metaTitle') };
}

// Origen de cada obra; un proyecto propio no tiene auditoria y quien lo mira debe saberlo.
const SOURCES = ['GANADA', 'PROPIA', 'PROYECTO'] as const;

function isSource(value: string): value is (typeof SOURCES)[number] {
  return (SOURCES as readonly string[]).includes(value);
}

export default async function PublicGalleryPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params;
  if (!isGalleryOwnerId(ownerId)) {
    notFound();
  }
  const [items, summary, t] = await Promise.all([getPublicGallery(ownerId), getGallerySummary(ownerId), getTranslations('PublicGallery')]);
  const followerCount = summary?.followerCount ?? 0;
  return (
    <>
      <Link href="/explorar" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {t('back')}
      </Link>
      <PageHeader
        eyebrow={t('eyebrow')}
        title={summary?.displayName ?? t('title')}
        description={summary ? t('ownerDescription') : t('description')}
        actions={summary ? <ProfileMark name={summary.displayName} avatarUrl={summary.avatarUrl} /> : null}
      />
      <div className="mb-6">
        <GallerySocial ownerId={ownerId} workCount={items.length} followerCount={followerCount} returnTo={`/galerias/${ownerId}`} />
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Images aria-hidden="true" className="h-6 w-6" />} title={t('empty.title')} description={t('empty.description')} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.lotId} className="flex flex-col overflow-hidden rounded-panel border border-line bg-surface">
              <Link href={item.source === 'GANADA' ? purchasedSheetHref(item.ownerId, item.lotId) : `/obras/${item.lotId}`} className="group flex flex-1 flex-col">
                <span className="block aspect-[4/3] w-full bg-paper">
                  <ArtworkImage src={item.previewUrl} alt="" cover />
                </span>
                <span className="block p-5">
                  <span className="block text-xs font-medium uppercase tracking-[0.18em] text-oxide">{isSource(item.source) ? t(`sources.${item.source}`) : t('sources.other')}</span>
                  <span className="mt-2 block font-serif text-xl leading-snug group-hover:underline">{item.title}</span>
                  <span className="mt-1 block text-sm text-muted">{item.artistName ?? t('unattributedArtist')}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
