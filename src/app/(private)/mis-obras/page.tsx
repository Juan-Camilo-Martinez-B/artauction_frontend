'use client';

import { Box, Eye, EyeOff, Frame, Gavel, Images, Pencil, Send, Share2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ArtworkImage } from '@/components/artwork-image';
import { RequireSession } from '@/components/session/require-session';
import { StatusPill } from '@/components/status-pill';
import { Button, ButtonLink } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { ApiError, artApi } from '@/lib/api/client';
import type { GalleryItem, Lot } from '@/lib/api/types';
import { isEditable, isPersonal, isReturned, sellerStatus } from '@/lib/artwork/lot-review';
import {
  ACQUIRED_FILTERS,
  applyFilter,
  canHang,
  collectWorks,
  countByFilter,
  lotIdOf,
  parseFilter,
  PUBLISHED_FILTERS,
  type FilterGroup,
  type MyWork,
  type WorkFilter,
} from '@/lib/artwork/my-works';
import { purchasedSheetHref } from '@/lib/artwork/sheet-href';
import { useFormat } from '@/hooks/use-format';
import { browserSession, type AccountProfile } from '@/lib/session/browser-session';
import { canSell } from '@/lib/session/roles';
import { canShowGalleryItem } from '@/lib/visibility';

/** Lo que significa cada estado para quien creo la obra. */
const STATUS_HINT: Record<string, string> = {
  DEVUELTA: 'Un administrador la devolvió. Corrígela y reenvíala a auditoría.',
  PERSONAL: 'Proyecto propio: solo para tu galería, sin auditoría.',
  BORRADOR: 'Aún no se ha enviado a auditoría.',
  PENDIENTE_AUDITORIA: 'La auditoría la está revisando.',
  REVISION_MANUAL: 'Un administrador la revisará pronto.',
  APROBADO: 'Está en el catálogo.',
  PUBLICADA: 'Está en el catálogo.',
  EN_SUBASTA: 'Tiene una sala de subasta.',
  VENDIDA: 'Se vendió en subasta: ahora es de quien la ganó.',
  CERRADO: 'La subasta cerró sin venta.',
};

/** Acciones de una fila; cada una devuelve si salio bien. */
interface WorkActions {
  busy: string | null;
  sells: boolean;
  hung: ReadonlySet<string>;
  resubmit: (lot: Lot) => void;
  toCatalog: (lot: Lot) => void;
  toggleVisibility: (lot: Lot) => void;
  toggleHang: (lotId: string, title: string) => void;
}

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
  const sells = canSell(profile.role);
  const [works, setWorks] = useState<MyWork[] | null>(null);
  const [hung, setHung] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [moving, setMoving] = useState<Lot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    // Cada fuente falla por separado: sin galeria se ven igual las obras creadas, y al reves.
    const [lots, items, room] = await Promise.allSettled([
      artApi.myLots(token),
      artApi.gallery(profile.userId, token),
      artApi.myGallery(token),
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
    if (room.status === 'fulfilled') {
      setHung(new Set(room.value.artworks.map((artwork) => artwork.lotId)));
    }
  }, [profile.userId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Ejecuta una accion sobre una obra con su estado de carga, su aviso y la recarga. */
  async function run(key: string, action: (token: string) => Promise<unknown>, done: string, failed: string): Promise<void> {
    setError(null);
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    setBusy(key);
    try {
      await action(token);
      notify(done, 'success');
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : failed);
    } finally {
      setBusy(null);
    }
  }

  const actions: WorkActions = {
    busy,
    sells,
    hung,
    resubmit: (lot) => void run(lot.id, (token) => artApi.submitLot(token, lot.id), `${lot.title} volvió a auditoría.`, 'No se pudo enviar la obra a auditoría.'),
    toCatalog: (lot) => {
      setMoving(lot);
    },
    toggleVisibility: (lot) => {
      const next = lot.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
      void run(
        lot.id,
        (token) => artApi.setLotVisibility(token, lot.id, next),
        next === 'PUBLIC' ? `${lot.title} ya se ve en tu galería pública.` : `${lot.title} ahora solo la ves tú.`,
        'No se pudo cambiar quién ve la obra.',
      );
    },
    toggleHang: (lotId, title) => {
      const hanging = !hung.has(lotId);
      void run(
        lotId,
        (token) => (hanging ? artApi.addToGallery(token, lotId) : artApi.removeFromGallery(token, lotId)),
        hanging ? `${title} quedó colgada en tu sala.` : `${title} salió de tu sala.`,
        hanging ? 'No se pudo colgar la obra.' : 'No se pudo quitar la obra de la sala.',
      );
    },
  };

  const counts = works ? countByFilter(works) : new Map<WorkFilter, number>();
  const shown = works ? applyFilter(works, filter) : null;

  return (
    <>
      <PageHeader
        eyebrow="Tu cuenta"
        title="Mis obras"
        description={
          sells
            ? 'Tus proyectos propios, lo que publicaste en el catálogo con su estado, y lo que ganaste. Las devueltas se pueden corregir y reenviar.'
            : 'Tus proyectos propios y las obras que ganaste en subasta.'
        }
        actions={
          <>
            <ButtonLink href="/publicar" icon={<Upload aria-hidden="true" className="h-4 w-4" />}>
              Nueva obra
            </ButtonLink>
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
          description="Sube un proyecto propio para tu sala 3D o gana una subasta: aquí verás cada obra y su estado."
          action={<ButtonLink href="/publicar">Subir la primera</ButtonLink>}
        />
      ) : null}
      {works && works.length > 0 ? (
        <>
          <nav aria-label="Filtrar por estado" className="mb-6 space-y-3">
            <FilterChips groups={[{ label: '', filters: [{ key: 'todas', label: 'Todas' }] }]} counts={counts} active={filter} />
            <FilterChips groups={[PUBLISHED_FILTERS]} counts={counts} active={filter} />
            <FilterChips groups={[ACQUIRED_FILTERS]} counts={counts} active={filter} />
          </nav>
          {shown?.length === 0 ? (
            <EmptyState title="No hay obras con esta etiqueta" action={<ButtonLink href="/mis-obras" variant="secondary">Ver todas</ButtonLink>} />
          ) : (
            <ul className="max-w-4xl space-y-4">
              {shown?.map((work) => (
                <li key={`${work.kind}-${lotIdOf(work)}`}>
                  {work.kind === 'published' ? <CreatedRow lot={work.lot} actions={actions} /> : <WonRow item={work.item} actions={actions} />}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      <ConfirmDialog
        open={moving !== null}
        title="Pasar al catálogo"
        confirmLabel="Enviar a auditoría"
        tone="accent"
        confirmLoading={moving !== null && busy === moving.id}
        onConfirm={() => {
          const lot = moving;
          if (lot) {
            void run(lot.id, (token) => artApi.submitLot(token, lot.id), `${lot.title} entró a la auditoría.`, 'No se pudo pasar la obra al catálogo.').then(() => {
              setMoving(null);
            });
          }
        }}
        onCancel={() => { setMoving(null); }}
      >
        La auditoría revisa la obra y, si la aprueba, la publica con su sala de subasta. Mientras tanto se oculta de tu galería pública y ya no la podrás editar.
      </ConfirmDialog>
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

/** Colgar o quitar de la sala 3D: solo para lo que es de uno. */
function HangButton({ lotId, title, actions }: { lotId: string; title: string; actions: WorkActions }) {
  const inRoom = actions.hung.has(lotId);
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={actions.busy === lotId}
      icon={<Frame aria-hidden="true" className="h-4 w-4" />}
      onClick={() => { actions.toggleHang(lotId, title); }}
    >
      {inRoom ? 'Quitar de mi sala' : 'Colgar en mi sala'}
    </Button>
  );
}

function CreatedRow({ lot, actions }: { lot: Lot; actions: WorkActions }) {
  const format = useFormat();
  const status = sellerStatus(lot);
  const hasImage = Boolean(lot.images?.some((image) => image.url));
  const busy = actions.busy === lot.id;
  const work: MyWork = { kind: 'published', lot };
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
        <p className="mt-1 text-sm text-muted">
          {STATUS_HINT[status] ?? ''}
          {isPersonal(lot) ? (lot.visibility === 'PUBLIC' ? ' Se ve en tu galería pública.' : ' Solo la ves tú.') : ''}
        </p>
        {isReturned(lot) && lot.lastReview?.reason ? (
          <blockquote className="mt-3 rounded-field border-l-4 border-oxide bg-paper px-3 py-2 text-sm">
            <span className="block text-xs uppercase tracking-wide text-muted">
              Motivo{lot.lastReview.createdAt ? ` · ${format.dateTime(lot.lastReview.createdAt)}` : ''}
            </span>
            {lot.lastReview.reason}
          </blockquote>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {isEditable(lot) ? (
            <ButtonLink href={`/publicar/${lot.id}`} size="sm" icon={<Pencil aria-hidden="true" className="h-4 w-4" />}>
              Editar
            </ButtonLink>
          ) : null}
          {lot.status === 'BORRADOR' ? (
            <Button
              size="sm"
              variant="secondary"
              loading={busy}
              disabled={!hasImage}
              title={hasImage ? undefined : 'Agrega una imagen antes de enviarla'}
              icon={<Send aria-hidden="true" className="h-4 w-4" />}
              onClick={() => { actions.resubmit(lot); }}
            >
              {isReturned(lot) ? 'Reenviar sin cambios' : 'Enviar a auditoría'}
            </Button>
          ) : null}
          {isPersonal(lot) ? (
            <Button
              size="sm"
              variant="secondary"
              loading={busy}
              icon={lot.visibility === 'PUBLIC' ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              onClick={() => { actions.toggleVisibility(lot); }}
            >
              {lot.visibility === 'PUBLIC' ? 'Hacer privada' : 'Hacer pública'}
            </Button>
          ) : null}
          {isPersonal(lot) && actions.sells ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={!hasImage || busy}
              title={hasImage ? undefined : 'Agrega una imagen antes de pasarla al catálogo'}
              icon={<Gavel aria-hidden="true" className="h-4 w-4" />}
              onClick={() => { actions.toCatalog(lot); }}
            >
              Pasar al catálogo
            </Button>
          ) : null}
          {canHang(work) ? <HangButton lotId={lot.id} title={lot.title} actions={actions} /> : null}
        </div>
      </div>
    </article>
  );
}

function WonRow({ item, actions }: { item: GalleryItem; actions: WorkActions }) {
  const format = useFormat();
  return (
    <article className="rounded-panel border border-line bg-surface p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-oxide">Ganada en subasta</p>
      <h2 className="mt-1 font-serif text-xl leading-snug">
        {/* La ficha original ya no es publica: se abre la que guardo la galeria. */}
        <Link href={purchasedSheetHref(item.ownerId, item.lotId)} className="hover:underline">
          {item.title}
        </Link>
      </h2>
      <p className="text-sm text-muted">{item.artistName ?? 'Artista sin atribuir'}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          {item.visibility === 'PUBLIC' ? <Eye aria-hidden="true" className="h-3.5 w-3.5" /> : <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />}
          {item.visibility === 'PUBLIC' ? 'Pública en tu galería' : 'Solo tú la ves'}
        </span>
        <time dateTime={item.acquiredAt}>{format.dateTime(item.acquiredAt)}</time>
      </div>
      <div className="mt-3">
        <HangButton lotId={item.lotId} title={item.title} actions={actions} />
      </div>
    </article>
  );
}
