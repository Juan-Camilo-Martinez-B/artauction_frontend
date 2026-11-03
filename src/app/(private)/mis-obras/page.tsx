'use client';

import { Box, Eye, EyeOff, Images, Pencil, Send, Share2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ArtworkImage } from '@/components/artwork-image';
import { RequireSession } from '@/components/session/require-session';
import { StatusPill } from '@/components/status-pill';
import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { ApiError, artApi } from '@/lib/api/client';
import type { GalleryItem, Lot } from '@/lib/api/types';
import { isReturned, sellerStatus } from '@/lib/artwork/lot-review';
import {
  ACQUIRED_FILTERS,
  applyFilter,
  collectWorks,
  countByFilter,
  parseFilter,
  PUBLISHED_FILTERS,
  type FilterGroup,
  type MyWork,
  type WorkFilter,
} from '@/lib/artwork/my-works';
import { formatDateTime } from '@/lib/format';
import { browserSession, type AccountProfile } from '@/lib/session/browser-session';
import { canShowGalleryItem } from '@/lib/visibility';

const SELLER_ROLES = new Set(['SELLER', 'ADMIN']);

/** Lo que significa cada estado para quien publico la obra. */
const STATUS_HINT: Record<string, string> = {
  DEVUELTA: 'Un administrador la devolvió. Corrígela y reenvíala a auditoría.',
  BORRADOR: 'Aún no se ha enviado a auditoría.',
  PENDIENTE_AUDITORIA: 'La auditoría la está revisando.',
  REVISION_MANUAL: 'Un administrador la revisará pronto.',
  APROBADO: 'Está en el catálogo.',
  PUBLICADA: 'Está en el catálogo.',
  EN_SUBASTA: 'Tiene una sala de subasta.',
  VENDIDA: 'Se vendió en subasta.',
  CERRADO: 'La subasta cerró sin venta.',
};

const SOURCE_LABEL: Record<GalleryItem['source'], string> = {
  GANADA: 'Ganada en subasta',
  PROPIA: 'Publicada por ti',
  GRATUITA: 'Añadida como prueba',
};

export default function MyWorksPage() {
  return (
    <RequireSession title="Entra para ver tus obras">
      {(profile) => (
        // useSearchParams necesita un limite de Suspense en una pagina de cliente.
        <Suspense fallback={<LoadingState label="Cargando tus obras…" />}>
          <MyWorks profile={profile} />
        </Suspense>
      )}
    </RequireSession>
  );
}

function MyWorks({ profile }: { profile: AccountProfile }) {
  const notify = useToast();
  const filter = parseFilter(useSearchParams().get('estado'));
  const sells = SELLER_ROLES.has(profile.role);
  const [works, setWorks] = useState<MyWork[] | null>(null);
  const [busyLot, setBusyLot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    // Cada fuente falla por separado: sin galeria se ven igual las publicadas, y al reves.
    const [lots, items] = await Promise.allSettled([
      sells ? artApi.myLots(token) : Promise.resolve([] as Lot[]),
      artApi.gallery(profile.userId, token),
    ]);
    const failed: unknown = lots.status === 'rejected' ? lots.reason : items.status === 'rejected' ? items.reason : null;
    if (failed !== null) {
      setError(failed instanceof ApiError ? failed.message : 'No se pudieron cargar todas tus obras.');
    }
    setWorks(
      collectWorks(
        lots.status === 'fulfilled' ? lots.value : [],
        items.status === 'fulfilled' ? items.value.filter((item) => canShowGalleryItem(item, profile.userId)) : [],
      ),
    );
  }, [profile.userId, sells]);

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

  const counts = works ? countByFilter(works) : new Map<WorkFilter, number>();
  const shown = works ? applyFilter(works, filter) : null;

  return (
    <>
      <PageHeader
        eyebrow="Tu cuenta"
        title="Mis obras"
        description={
          sells
            ? 'Lo que publicaste, en qué paso está, y lo que adquiriste. Las devueltas se pueden corregir y reenviar.'
            : 'Las obras que ganaste en subasta o añadiste a tu galería.'
        }
        actions={
          <>
            {sells ? (
              <ButtonLink href="/publicar" icon={<Upload aria-hidden="true" className="h-4 w-4" />}>
                Publicar obra
              </ButtonLink>
            ) : null}
            <ButtonLink href="/mi-galeria" variant="secondary" icon={<Box aria-hidden="true" className="h-4 w-4" />}>
              Sala 3D
            </ButtonLink>
            <ButtonLink href={`/galerias/${profile.userId}`} variant="secondary" icon={<Share2 aria-hidden="true" className="h-4 w-4" />}>
              Galería pública
            </ButtonLink>
          </>
        }
      />
      {error ? <Notice tone="error" className="mb-6">{error}</Notice> : null}
      {works === null ? <LoadingState label="Cargando tus obras…" /> : null}
      {works?.length === 0 ? (
        <EmptyState
          icon={<Images aria-hidden="true" className="h-6 w-6" />}
          title="Todavía no tienes obras"
          description={sells ? 'Publica una o gana una subasta: aquí verás su estado.' : 'Las obras que ganes en subasta llegan aquí y a tu sala 3D.'}
          action={sells ? <ButtonLink href="/publicar">Publicar la primera</ButtonLink> : <ButtonLink href="/catalogo">Ver salas en vivo</ButtonLink>}
        />
      ) : null}
      {works && works.length > 0 ? (
        <>
          <nav aria-label="Filtrar por estado" className="mb-6 space-y-3">
            <FilterChips groups={[{ label: '', filters: [{ key: 'todas', label: 'Todas' }] }]} counts={counts} active={filter} />
            {sells ? <FilterChips groups={[PUBLISHED_FILTERS]} counts={counts} active={filter} /> : null}
            <FilterChips groups={[ACQUIRED_FILTERS]} counts={counts} active={filter} />
          </nav>
          {shown?.length === 0 ? (
            <EmptyState title="No hay obras con esta etiqueta" action={<ButtonLink href="/mis-obras" variant="secondary">Ver todas</ButtonLink>} />
          ) : (
            <ul className="max-w-4xl space-y-4">
              {shown?.map((work) =>
                work.kind === 'published' ? (
                  <li key={`lot-${work.lot.id}`}>
                    <PublishedRow lot={work.lot} busy={busyLot === work.lot.id} onResubmit={() => void resubmit(work.lot)} />
                  </li>
                ) : (
                  <li key={`item-${work.item.lotId ?? work.item.title}-${work.item.acquiredAt}`}>
                    <AcquiredRow item={work.item} />
                  </li>
                ),
              )}
            </ul>
          )}
        </>
      ) : null}
    </>
  );
}

/** Chips con contador; los que no tienen obras no se muestran. */
function FilterChips({ groups, counts, active }: { groups: FilterGroup[]; counts: Map<WorkFilter, number>; active: WorkFilter }) {
  return (
    <>
      {groups.map((group) => {
        const visible = group.filters.filter((filter) => (counts.get(filter.key) ?? 0) > 0 || filter.key === active);
        if (visible.length === 0) {
          return null;
        }
        return (
          <div key={group.label || 'todas'} className="flex items-center gap-3">
            {group.label ? <span className="shrink-0 text-xs uppercase tracking-[0.16em] text-muted">{group.label}</span> : null}
            <ul className="flex gap-2 overflow-x-auto pb-1">
              {visible.map((filter) => {
                const selected = filter.key === active;
                return (
                  <li key={filter.key} className="shrink-0">
                    <Link
                      href={filter.key === 'todas' ? '/mis-obras' : `/mis-obras?estado=${filter.key}`}
                      aria-current={selected ? 'page' : undefined}
                      scroll={false}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
                        selected ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-surface hover:border-ink'
                      }`}
                    >
                      {filter.label}
                      <span className={`text-xs ${selected ? 'text-paper/80' : 'text-muted'}`}>{counts.get(filter.key) ?? 0}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}

function PublishedRow({ lot, busy, onResubmit }: { lot: Lot; busy: boolean; onResubmit: () => void }) {
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

function AcquiredRow({ item }: { item: GalleryItem }) {
  return (
    <article className="rounded-panel border border-line bg-surface p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-oxide">{SOURCE_LABEL[item.source]}</p>
      <h2 className="mt-1 font-serif text-xl leading-snug">
        {item.lotId ? (
          <Link href={`/obras/${item.lotId}`} className="hover:underline">
            {item.title}
          </Link>
        ) : (
          item.title
        )}
      </h2>
      <p className="text-sm text-muted">{item.artistName ?? 'Artista sin atribuir'}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          {item.visibility === 'PUBLIC' ? <Eye aria-hidden="true" className="h-3.5 w-3.5" /> : <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />}
          {item.visibility === 'PUBLIC' ? 'Pública en tu galería' : 'Solo tú la ves'}
        </span>
        <time dateTime={item.acquiredAt}>{formatDateTime(item.acquiredAt)}</time>
      </div>
    </article>
  );
}
