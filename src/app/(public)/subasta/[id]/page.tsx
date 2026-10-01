import { LiveRoom } from './live-room';

export const dynamic = 'force-dynamic';

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section>
      <p className="text-sm uppercase tracking-[0.2em] text-oxide">Sala en vivo</p>
      <h1 className="mt-2 font-serif text-4xl">La puja</h1>
      <div className="mt-6">
        <LiveRoom auctionId={id} />
      </div>
    </section>
  );
}
