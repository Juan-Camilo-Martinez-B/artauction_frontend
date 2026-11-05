import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LiveRoom } from './live-room';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Room');
  return { title: t('metaTitle') };
}

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LiveRoom auctionId={id} />;
}
