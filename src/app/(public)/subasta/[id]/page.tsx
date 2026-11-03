import type { Metadata } from 'next';
import { LiveRoom } from './live-room';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sala de subasta' };

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LiveRoom auctionId={id} />;
}
