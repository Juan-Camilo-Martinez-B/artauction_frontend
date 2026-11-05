import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getLot } from '@/lib/api/server';
import { ArtworkExhibit } from './artwork-exhibit';
import { OwnLot } from './own-lot';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const lot = await getLot(id);
  const t = await getTranslations('Artwork');
  return { title: lot?.title ?? t('work') };
}

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lot = await getLot(id);
  if (lot?.visibility === 'PUBLIC') {
    return <ArtworkExhibit lot={lot} />;
  }
  return <OwnLot id={id} />;
}
