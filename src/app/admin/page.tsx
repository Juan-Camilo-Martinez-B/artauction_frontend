'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { ArtworkImage } from '@/components/artwork-image';
import { RequireSession } from '@/components/session/require-session';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { ApiError, artApi } from '@/lib/api/client';
import type { ReviewFinding, ReviewItem } from '@/lib/api/types';
import { browserSession } from '@/lib/session/browser-session';

type Verdict = 'APROBADO' | 'BORRADOR';

const severityStyle: Record<ReviewFinding['severity'], { label: string; className: string }> = {
  CRITICAL: { label: 'Crítico', className: 'border-oxide text-oxide' },
  WARNING: { label: 'Advertencia', className: 'border-ochre text-ochre' },
  INFO: { label: 'Nota', className: 'border-line text-muted' },
};

const decidedByLabel: Record<string, string> = {
  RULES: 'Decidió una regla del sistema',
  AI: 'Evaluó la IA sobre el expediente',
  FALLBACK: 'La auditoría automática no terminó',
};

function FindingRow({ finding }: { finding: ReviewFinding }) {
  const style = severityStyle[finding.severity];
  return (
    <li className="rounded-field border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs uppercase tracking-wide ${style.className}`}>{style.label}</span>
        <span className="font-mono text-xs text-muted">{finding.code}</span>
      </div>
      <p className="mt-2 text-sm">{finding.message}</p>
      {finding.evidence.length > 0 ? (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted">Evidencias ({finding.evidence.length})</summary>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {finding.evidence.map((item) => (
              <div key={item.code} className="contents">
                <dt className="font-mono text-xs text-muted">{item.code}</dt>
                <dd className="break-words">{item.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </li>
  );
}

function ReviewCard({ item, busy, onResolve }: { item: ReviewItem; busy: boolean; onResolve: (lotId: string, verdict: Verdict) => void }) {
  const { lot, audit } = item;
  return (
    <article className="grid gap-5 rounded-panel border border-line bg-surface p-5 shadow-panel sm:grid-cols-[10rem_1fr]">
      <div className="overflow-hidden rounded-field border border-line">
        <ArtworkImage src={lot.images?.[0]?.url ?? null} alt={lot.title} />
      </div>
      <div>
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">
              <Link href={`/obras/${lot.id}`} className="hover:underline">
                {lot.title}
              </Link>
            </h2>
            <p className="text-sm text-muted">
              {lot.artistName ?? 'Autoría sin declarar'} · {lot.materials}
              {lot.creationYear ? ` · ${String(lot.creationYear)}` : ''}
            </p>
          </div>
          <p className="text-right">
            <span className="block font-serif text-3xl">{audit ? audit.score : '—'}</span>
            <span className="text-xs uppercase tracking-wide text-muted">score</span>
          </p>
        </header>

        {audit ? (
          <>
            <p className="mt-3 text-sm text-muted">
              {(audit.decidedBy && decidedByLabel[audit.decidedBy]) ?? 'Auditoría anterior al expediente de evidencias'} · {audit.modelName}
            </p>
            {audit.findings.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {audit.findings.map((finding) => (
                  <FindingRow key={`${finding.code}-${finding.message}`} finding={finding} />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">La auditoría no dejó hallazgos.</p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">El expediente de auditoría no está disponible ahora. Puedes resolver igual.</p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Button loading={busy} onClick={() => { onResolve(lot.id, 'APROBADO'); }}>
            Aprobar y publicar
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => { onResolve(lot.id, 'BORRADOR'); }}>
            Devolver a borrador
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function AdminPage() {
  return (
    <RequireSession roles={['ADMIN']} title="Entra con una cuenta administradora">
      {() => <ReviewQueue />}
    </RequireSession>
  );
}

function ReviewQueue() {
  const notify = useToast();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [busyLot, setBusyLot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    try {
      setItems(await artApi.reviewQueue(token));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar la cola de revisión.');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(lotId: string, verdict: Verdict) {
    setError(null);
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    setBusyLot(lotId);
    try {
      const lot = await artApi.resolveLot(token, lotId, verdict);
      setItems((current) => (current ? current.filter((item) => item.lot.id !== lotId) : current));
      notify(verdict === 'APROBADO' ? `${lot.title} quedó publicada.` : `${lot.title} volvió a borrador.`, 'success');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo resolver la obra.');
    } finally {
      setBusyLot(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Revisión manual"
        description="Obras que la auditoría no pudo aprobar sola, con los hallazgos y las evidencias que usó."
      />
      {error ? <Notice tone="error" className="mb-6">{error}</Notice> : null}
      {items === null ? <LoadingState label="Cargando la cola…" /> : null}
      {items?.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck aria-hidden="true" className="h-6 w-6" />}
          title="No hay obras esperando revisión"
          description="Cuando la auditoría deje una obra en revisión manual, aparecerá aquí."
        />
      ) : null}
      {items && items.length > 0 ? (
        <div className="max-w-4xl space-y-6">
          {items.map((item) => (
            <ReviewCard
              key={item.lot.id}
              item={item}
              busy={busyLot === item.lot.id}
              onResolve={(lotId, verdict) => {
                void resolve(lotId, verdict);
              }}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
