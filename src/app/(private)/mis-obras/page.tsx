'use client';

import { Pencil, Send, Upload } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArtworkImage } from '@/components/artwork-image';
import { RequireSession } from '@/components/session/require-session';
import { StatusPill } from '@/components/status-pill';
import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { ApiError, artApi } from '@/lib/api/client';
import type { Lot } from '@/lib/api/types';
import { isReturned, sellerStatus } from '@/lib/artwork/lot-review';
import { formatDateTime } from '@/lib/format';
import { browserSession } from '@/lib/session/browser-session';

/** Lo que significa cada estado para quien publico la obra. */
const STATUS_HINT: Record<string, string> = {
  DEVUELTA: 'Un administrador la devolvió. Corrígela y reenvíala a auditoría.',
  BORRADOR: 'Aún no se ha enviado a auditoría.',
  PENDIENTE_AUDITORIA: 'La auditoría la está revisando.',
  REVISION_MANUAL: 'Un administrador la revisará pronto.',
  PUBLICADA: 'Está en el catálogo.',
  EN_SUBASTA: 'Tiene una sala de subasta.',
  VENDIDA: 'Se vendió en subasta.',
};

export default function MyLotsPage() {
  return (
    <RequireSession roles={['SELLER', 'ADMIN']} title="Entra para ver tus obras">
      {() => <MyLots />}
    </RequireSession>
  );
}

function MyLots() {
  const notify = useToast();
  const [lots, setLots] = useState<Lot[] | null>(null);
  const [busyLot, setBusyLot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    try {
      setLots(await artApi.myLots(token));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron cargar tus obras.');
      setLots([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resubmit(lot: Lot) {
    setError(null);
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    setBusyLot(lot.id);
    try {
      await artApi.submitLot(token, lot.id);
      notify(`${lot.title} volvió a auditoría.`, 'success');
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar la obra a auditoría.');
    } finally {
      setBusyLot(null);
    }
  }

  // Las devueltas primero: son las que piden algo a la persona.
  const ordered = lots ? [...lots].sort((left, right) => Number(isReturned(right)) - Number(isReturned(left))) : null;

  return (
    <>
      <PageHeader
        eyebrow="Vendedor"
        title="Mis obras"
        description="Todas las obras que publicaste y en qué paso están. Las devueltas se pueden corregir y reenviar."
        actions={<ButtonLink href="/publicar" icon={<Upload aria-hidden="true" className="h-4 w-4" />}>Publicar obra</ButtonLink>}
      />
      {error ? <Notice tone="error" className="mb-6">{error}</Notice> : null}
      {ordered === null ? <LoadingState label="Cargando tus obras…" /> : null}
      {ordered?.length === 0 ? (
        <EmptyState
          title="Todavía no publicas obras"
          description="Cuando publiques una, aquí verás su auditoría y su subasta."
          action={<ButtonLink href="/publicar">Publicar la primera</ButtonLink>}
        />
      ) : null}
      {ordered && ordered.length > 0 ? (
        <ul className="max-w-4xl space-y-4">
          {ordered.map((lot) => (
            <li key={lot.id}>
              <LotRow lot={lot} busy={busyLot === lot.id} onResubmit={() => void resubmit(lot)} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function LotRow({ lot, busy, onResubmit }: { lot: Lot; busy: boolean; onResubmit: () => void }) {
  const status = sellerStatus(lot);
  const hasImage = Boolean(lot.images?.some((image) => image.url));
  return (
    <article className="grid gap-4 rounded-panel border border-line bg-surface p-4 shadow-panel sm:grid-cols-[7rem_1fr]">
      <div className="overflow-hidden rounded-field border border-line">
        <ArtworkImage src={lot.images?.[0]?.url ?? null} alt={lot.title} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={status} />
          <Link href={`/obras/${lot.id}`} className="font-serif text-xl hover:underline">
            {lot.title}
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted">{STATUS_HINT[status] ?? ''}</p>
        {isReturned(lot) && lot.lastReview?.reason ? (
          <blockquote className="mt-3 rounded-field border-l-4 border-oxide bg-paper px-3 py-2 text-sm">
            <span className="block text-xs uppercase tracking-wide text-muted">
              Motivo{lot.lastReview.createdAt ? ` · ${formatDateTime(lot.lastReview.createdAt)}` : ''}
            </span>
            {lot.lastReview.reason}
          </blockquote>
        ) : null}
        {lot.status === 'BORRADOR' ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href={`/publicar/${lot.id}`} size="sm" icon={<Pencil aria-hidden="true" className="h-4 w-4" />}>
              Editar
            </ButtonLink>
            <Button
              size="sm"
              variant="secondary"
              loading={busy}
              disabled={!hasImage}
              title={hasImage ? undefined : 'Agrega una imagen antes de enviarla'}
              icon={<Send aria-hidden="true" className="h-4 w-4" />}
              onClick={onResubmit}
            >
              {isReturned(lot) ? 'Reenviar sin cambios' : 'Enviar a auditoría'}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
