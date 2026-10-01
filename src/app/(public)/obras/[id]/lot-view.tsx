import Link from 'next/link';
import { StatusPill } from '@/components/status-pill';
import { ScoreRing } from '@/components/score-ring';
import { formatMoney } from '@/lib/money';
import type { Lot } from '@/lib/api/types';

export async function LotBody({ promise }: { promise: Promise<Lot | null> }) {
  const lot = await promise;
  if (!lot || lot.visibility !== 'PUBLIC') {
    return <p>Esta obra no está en el catálogo público.</p>;
  }
  return (
    <article>
      <StatusPill status={lot.status} />
      <h1 className="mt-3 font-serif text-5xl">{lot.title}</h1>
      <p className="mt-2 text-muted">{lot.artistName ?? 'Sin atribuir'} · {lot.creationYear ?? 'año desconocido'}</p>
      <p className="mt-6 max-w-2xl text-lg">{lot.description}</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted">Materiales</dt>
          <dd>{lot.materials}</dd>
        </div>
        <div>
          <dt className="text-muted">Banda sugerida</dt>
          <dd>
            {formatMoney(lot.suggestedPriceMin)} – {formatMoney(lot.suggestedPriceMax)}
          </dd>
        </div>
      </dl>
      {lot.auction && lot.status === 'EN_SUBASTA' ? (
        <Link href={`/subasta/${lot.auction.id}`} className="mt-8 inline-block rounded-full bg-ink px-5 py-2 text-paper">
          Entrar a la sala
        </Link>
      ) : null}
    </article>
  );
}

export async function ScoreBody({ promise }: { promise: Promise<Lot | null> }) {
  const lot = await promise;
  if (!lot || lot.visibility !== 'PUBLIC') {
    return null;
  }
  const summary = lot.auditSummaries?.[0];
  return (
    <aside aria-label="Reporte de autenticidad">
      <ScoreRing score={lot.authenticityScore} verdict={summary?.verdict ?? null} />
      <p className="mt-4 text-sm text-muted">
        {summary
          ? `Modelo ${summary.modelName}, prompt ${summary.promptVersion}. ${summary.hasCriticalInconsistency ? 'Hay una inconsistencia crítica.' : 'Sin inconsistencia crítica.'}`
          : 'El reporte completo llega cuando termina la auditoría.'}
      </p>
    </aside>
  );
}
