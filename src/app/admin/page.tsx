'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { ArtworkImage } from '@/components/artwork-image';
import { RequireSession } from '@/components/session/require-session';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { TextAreaField, TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { ApiError, artApi, type ResolveLotInput } from '@/lib/api/client';
import type { Lot, ReviewFinding, ReviewItem } from '@/lib/api/types';
import { browserSession } from '@/lib/session/browser-session';

/** Mismos limites que catalog-service. */
const REASON_MIN = 10;
const REASON_MAX = 500;
const PRICE_MAX = 1_000_000;

const severityStyle: Record<ReviewFinding['severity'], { label: string; className: string }> = {
  CRITICAL: { label: 'Crítico', className: 'border-oxide text-oxide' },
  WARNING: { label: 'Advertencia', className: 'border-ochre text-ochre' },
  INFO: { label: 'Nota', className: 'border-line text-muted' },
};

const decidedByLabel: Record<string, string> = {
  RULES: 'Decidió una regla del sistema',
  AI: 'Evaluó la IA sobre el expediente',
  LOCAL: 'Evaluación local, sin IA: Gemini no respondió',
  FALLBACK: 'La auditoría automática no terminó',
};

const RESOLVED_MESSAGE: Record<ResolveLotInput['verdict'], (title: string) => string> = {
  APROBADO: (title) => `${title} quedó publicada.`,
  BORRADOR: (title) => `${title} volvió al vendedor con tu motivo.`,
  REAUDITAR: (title) => `${title} volvió a la cola de auditoría.`,
};

/** Solo digitos, sin ceros a la izquierda: artacoins enteras. */
const coins = (raw: string) => raw.replace(/\D+/g, '').replace(/^0+/, '').slice(0, 7);

/** Precio sugerido guardado ("120.00") como entero, o vacio si no hay. */
function storedCoins(value: string | null): string {
  const parsed = Math.round(Number(value ?? 0));
  return parsed > 0 ? String(parsed) : '';
}

function priceError(min: string, max: string, required: boolean): string | undefined {
  if (min === '' && max === '') {
    return required ? 'Esta obra no tiene precio sugerido: fija el rango para aprobarla.' : undefined;
  }
  if (min === '' || max === '') {
    return 'Indica el precio mínimo y el máximo.';
  }
  if (Number(min) < 1 || Number(max) > PRICE_MAX) {
    return `El rango va de 1 a ${PRICE_MAX.toLocaleString('es-CO')} artacoins.`;
  }
  return Number(max) < Number(min) ? 'El máximo no puede ser menor que el mínimo.' : undefined;
}

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

function ReviewCard({
  item,
  busy,
  onResolve,
}: {
  item: ReviewItem;
  busy: boolean;
  onResolve: (lot: Lot, input: ResolveLotInput) => Promise<boolean>;
}) {
  const { lot, audit } = item;
  const suggestedMin = storedCoins(lot.suggestedPriceMin);
  const suggestedMax = storedCoins(lot.suggestedPriceMax);
  const priceRequired = suggestedMin === '' || suggestedMax === '';
  const [priceMin, setPriceMin] = useState(suggestedMin);
  const [priceMax, setPriceMax] = useState(suggestedMax);
  const [priceTouched, setPriceTouched] = useState(false);
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState('');
  const price = priceError(priceMin, priceMax, priceRequired);
  const reasonLength = reason.trim().length;
  const reasonValid = reasonLength >= REASON_MIN && reasonLength <= REASON_MAX;
  // Re-auditar solo tiene sentido si esta vez la IA no opino.
  const canReaudit = audit?.decidedBy === 'LOCAL' || audit?.decidedBy === 'FALLBACK';

  function approve() {
    setPriceTouched(true);
    if (price) {
      return;
    }
    const band = priceMin !== '' && priceMax !== '' ? { priceMin: Number(priceMin), priceMax: Number(priceMax) } : {};
    void onResolve(lot, { verdict: 'APROBADO', ...band });
  }

  async function sendBack() {
    if (!reasonValid) {
      return;
    }
    if (await onResolve(lot, { verdict: 'BORRADOR', reason: reason.trim() })) {
      setReturning(false);
    }
  }

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

        <fieldset className="mt-5 rounded-field border border-line bg-paper p-4">
          <legend className="px-1 text-sm font-medium">Rango de precio al publicar (artacoins)</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id={`price-min-${lot.id}`}
              label="Mínimo"
              inputMode="numeric"
              value={priceMin}
              format={coins}
              onValueChange={setPriceMin}
              onBlur={() => { setPriceTouched(true); }}
            />
            <TextField
              id={`price-max-${lot.id}`}
              label="Máximo"
              inputMode="numeric"
              value={priceMax}
              format={coins}
              onValueChange={setPriceMax}
              onBlur={() => { setPriceTouched(true); }}
            />
          </div>
          {priceTouched && price ? (
            <p role="alert" className="mt-2 text-sm text-oxide">
              {price}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">
              {priceRequired ? 'La auditoría no estimó precio: es obligatorio para aprobar.' : 'Viene de la auditoría; puedes ajustarlo antes de aprobar.'}
            </p>
          )}
        </fieldset>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button loading={busy && !returning} disabled={busy} onClick={approve}>
            Aprobar y publicar
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => { setReturning(true); }}>
            Devolver al vendedor
          </Button>
          {canReaudit ? (
            <Button
              variant="ghost"
              disabled={busy}
              icon={<RotateCcw aria-hidden="true" className="h-4 w-4" />}
              onClick={() => void onResolve(lot, { verdict: 'REAUDITAR' })}
            >
              Re-auditar con IA
            </Button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={returning}
        title="Devolver la obra al vendedor"
        confirmLabel="Devolver con este motivo"
        confirmDisabled={!reasonValid}
        confirmLoading={busy}
        onConfirm={() => void sendBack()}
        onCancel={() => { setReturning(false); }}
      >
        <p className="mb-3">La obra vuelve a borrador. El vendedor recibe un aviso con el motivo y puede corregirla y reenviarla.</p>
        <TextAreaField
          id={`reason-${lot.id}`}
          label="Motivo"
          rows={4}
          maxLength={REASON_MAX}
          value={reason}
          onValueChange={setReason}
          hint={`${String(reasonLength)}/${String(REASON_MAX)} · al menos ${String(REASON_MIN)} caracteres. Di qué debe corregir.`}
        />
      </ConfirmDialog>
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

  async function resolve(lot: Lot, input: ResolveLotInput): Promise<boolean> {
    setError(null);
    const token = await browserSession.accessToken();
    if (!token) {
      return false;
    }
    setBusyLot(lot.id);
    try {
      await artApi.resolveLot(token, lot.id, input);
      setItems((current) => (current ? current.filter((item) => item.lot.id !== lot.id) : current));
      notify(RESOLVED_MESSAGE[input.verdict](lot.title), 'success');
      return true;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo resolver la obra.');
      return false;
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
            <ReviewCard key={item.lot.id} item={item} busy={busyLot === item.lot.id} onResolve={resolve} />
          ))}
        </div>
      ) : null}
    </>
  );
}
