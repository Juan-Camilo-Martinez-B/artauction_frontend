import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getLot } from '@/lib/api/server';
import { LotBody, ScoreBody } from './lot-view';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const lot = await getLot(id);
  return { title: lot?.title ?? 'Obra' };
}

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lotPromise = getLot(id);
  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-line" aria-hidden="true" />}>
        <LotBody promise={lotPromise} />
      </Suspense>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-line" aria-hidden="true" />}>
        <ScoreBody promise={lotPromise} />
      </Suspense>
    </div>
  );
}
