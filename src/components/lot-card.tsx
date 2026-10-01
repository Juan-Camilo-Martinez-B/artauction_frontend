import Link from 'next/link';
import { formatMoney } from '@/lib/money';
import type { Lot } from '@/lib/api/types';
import { StatusPill } from './status-pill';

export function LotCard({ lot }: { lot: Lot }) {
  return (
    <article className="flex flex-col justify-between rounded-xl border border-line bg-white p-4">
      <div>
        <StatusPill status={lot.status} />
        <h2 className="mt-3 font-serif text-2xl leading-tight">
          <Link href={`/obras/${lot.id}`}>{lot.title}</Link>
        </h2>
        <p className="mt-1 text-sm text-muted">{lot.artistName ?? 'Artista sin atribuir'}</p>
        <p className="mt-3 line-clamp-3 text-sm">{lot.description}</p>
      </div>
      <p className="mt-4 text-sm">
        Score {lot.authenticityScore ?? '—'} · {formatMoney(lot.suggestedPriceMin)} – {formatMoney(lot.suggestedPriceMax)}
      </p>
    </article>
  );
}
