import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProfileMark } from '@/components/account/profile-mark';
import { PublicRoom } from '@/components/social/public-room';
import { PageHeader } from '@/components/ui/layout';
import { getGallerySummary } from '@/lib/api/server';
import { isGalleryOwnerId } from '@/lib/social/explore';

// La pagina depende del idioma de cada visita (cookie), asi que se renderiza por
// peticion. Declararla estatica hace que Next responda 500 en produccion.
export async function generateMetadata({ params }: { params: Promise<{ ownerId: string }> }): Promise<Metadata> {
  const { ownerId } = await params;
  const summary = isGalleryOwnerId(ownerId) ? await getGallerySummary(ownerId) : null;
  const t = await getTranslations('PublicGallery');
  return { title: summary?.displayName ?? t('metaTitle') };
}

export default async function PublicGalleryPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params;
  if (!isGalleryOwnerId(ownerId)) {
    notFound();
  }
  const [summary, t] = await Promise.all([getGallerySummary(ownerId), getTranslations('PublicGallery')]);
  return (
    <>
      <Link href="/explorar" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {t('back')}
      </Link>
      <PageHeader
        eyebrow={t('eyebrow')}
        title={summary?.displayName ?? t('title')}
        description={t('ownerDescription')}
        actions={summary ? <ProfileMark name={summary.displayName} avatarUrl={summary.avatarUrl} /> : null}
      />
      <PublicRoom ownerId={ownerId} followerCount={summary?.followerCount ?? 0} returnTo={`/galerias/${ownerId}`} />
    </>
  );
}
