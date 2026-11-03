'use client';

import { Footprints, LayoutGrid, Move3d, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArtworkCard } from '@/components/gallery3d/artwork-card';
import { AmbiencePanel } from '@/components/gallery3d/ambience-panel';
import type { SceneArtwork, SceneMode } from '@/components/gallery3d/gallery-scene';
import { PlacementPanel } from '@/components/gallery3d/placement-panel';
import { RequireSession } from '@/components/session/require-session';
import { TouchPad } from '@/components/gallery3d/touch-pad';
import type { MoveIntent, Viewpoint } from '@/components/gallery3d/tour-controls';
import { Button, ButtonLink } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingState, PageHeader, Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { ApiError, artApi } from '@/lib/api/client';
import type { GalleryConfig, PersonalGallery } from '@/lib/api/types';
import { DEFAULT_GALLERY_CONFIG, sameConfig } from '@/lib/gallery/default-config';
import { artworkSize, hangingPlan, hasOverlaps, isObjectLot, objectTop, roomOf, viewpointFor, type Placement } from '@/lib/gallery/layout';
import { browserSession } from '@/lib/session/browser-session';

// La escena 3D solo existe en el navegador: se carga aparte para no pesar en el primer render.
const GalleryScene = dynamic(() => import('@/components/gallery3d/gallery-scene').then((module) => module.GalleryScene), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-paper/80">Preparando la sala…</div>,
});

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; gallery: PersonalGallery };

type GalleryArtwork = PersonalGallery['artworks'][number];

function storedPlacement(artwork: GalleryArtwork): Placement {
  return { posX: artwork.posX, posY: artwork.posY, posZ: artwork.posZ, rotY: artwork.rotY, scale: artwork.scale, support: artwork.support };
}

function samePlacement(a: Placement, b: Placement): boolean {
  const close = (x: number, y: number) => Math.abs(x - y) < 1e-4;
  return close(a.posX, b.posX) && close(a.posY, b.posY) && close(a.posZ, b.posZ) && close(a.rotY, b.rotY) && close(a.scale, b.scale) && a.support === b.support;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => { setReduced(event.matches); };
    query.addEventListener('change', onChange);
    return () => { query.removeEventListener('change', onChange); };
  }, []);
  return reduced;
}

export function GalleryStudio() {
  return (
    <RequireSession title="Entra para ver tu galería" description="Tu sala 3D guarda las obras que ganas en subasta.">
      {() => <Studio />}
    </RequireSession>
  );
}

function Studio() {
  const notify = useToast();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [configDraft, setConfigDraft] = useState<GalleryConfig | null>(null);
  const [placementDraft, setPlacementDraft] = useState<ReadonlyMap<string, Placement>>(new Map());
  const [mode, setMode] = useState<SceneMode>('tour');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<GalleryArtwork | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intent = useRef<MoveIntent>({ forward: 0, turn: 0 });
  const viewport = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const adopt = useCallback((gallery: PersonalGallery) => {
    setState({ status: 'ready', gallery });
    setConfigDraft(gallery.appliedConfig ?? DEFAULT_GALLERY_CONFIG);
    setPlacementDraft(new Map());
  }, []);

  useEffect(() => {
    void browserSession.accessToken().then(async (token) => {
      if (!token) {
        return;
      }
      try {
        adopt(await artApi.myGallery(token));
      } catch (caught) {
        setState({ status: 'error', message: caught instanceof ApiError ? caught.message : 'No se pudo abrir la galería.' });
      }
    });
  }, [adopt]);

  const gallery = state.status === 'ready' ? state.gallery : null;
  const savedConfig = gallery?.appliedConfig ?? DEFAULT_GALLERY_CONFIG;
  const config = configDraft ?? savedConfig;
  const configDirty = gallery !== null && !sameConfig(config, savedConfig);
  const dirty = configDirty || placementDraft.size > 0;
  const room = roomOf(config);

  const sceneArtworks = useMemo<SceneArtwork[]>(
    () =>
      (gallery?.artworks ?? []).map((artwork) => ({
        id: artwork.id,
        lot: artwork.lot,
        placement: placementDraft.get(artwork.id) ?? storedPlacement(artwork),
      })),
    [gallery, placementDraft],
  );

  const overlapping = useMemo(
    () => hasOverlaps(sceneArtworks.map((artwork) => ({ placement: artwork.placement, size: artworkSize(artwork.lot) }))),
    [sceneArtworks],
  );

  // Avisar antes de cerrar la pestana con cambios sin guardar.
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); };
  }, [dirty]);

  const focus = useMemo<Viewpoint | null>(() => {
    const artwork = sceneArtworks.find((item) => item.id === focusId);
    if (!artwork) {
      return null;
    }
    const size = artworkSize(artwork.lot);
    return viewpointFor(artwork.placement, size, room, isObjectLot(artwork.lot) ? objectTop(size, artwork.placement.scale) : undefined);
  }, [focusId, sceneArtworks, room]);

  const onSelect = useCallback(
    (id: string | null) => {
      if (mode === 'tour') {
        setFocusId(id);
      } else {
        setSelectedId(id);
      }
    },
    [mode],
  );

  function changeMode(next: SceneMode) {
    setMode(next);
    setFocusId(null);
    setSelectedId(null);
  }

  function setPlacement(id: string, next: Placement) {
    const artwork = gallery?.artworks.find((item) => item.id === id);
    if (!artwork) {
      return;
    }
    setPlacementDraft((current) => {
      const copy = new Map(current);
      if (samePlacement(next, storedPlacement(artwork))) {
        copy.delete(id);
      } else {
        copy.set(id, next);
      }
      return copy;
    });
  }

  function organize() {
    if (!gallery) {
      return;
    }
    const plan = hangingPlan(
      gallery.artworks.map((artwork) => ({ id: artwork.id, size: artworkSize(artwork.lot), isObject: isObjectLot(artwork.lot) })),
      room,
    );
    const next = new Map<string, Placement>();
    for (const artwork of gallery.artworks) {
      const planned = plan.get(artwork.id);
      if (planned && !samePlacement(planned, storedPlacement(artwork))) {
        next.set(artwork.id, planned);
      }
    }
    setPlacementDraft(next);
    notify(next.size > 0 ? 'Propuesta de montaje lista. Guárdala si te gusta.' : 'La sala ya está ordenada.', 'info');
  }

  function discard() {
    setConfigDraft(savedConfig);
    setPlacementDraft(new Map());
    setError(null);
  }

  async function save() {
    const token = await browserSession.accessToken();
    if (!token || !gallery) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let latest = gallery;
      if (configDirty) {
        latest = await artApi.saveGalleryConfig(token, config);
      }
      for (const artwork of gallery.artworks) {
        const placement = placementDraft.get(artwork.id);
        if (placement) {
          latest = await artApi.placeArtwork(token, artwork.lotId, placement);
        }
      }
      adopt(latest);
      notify('Cambios guardados.', 'success');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  }

  async function restore() {
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    try {
      adopt(await artApi.restoreGallery(token));
      notify('Volviste a la propuesta del asistente.', 'success');
    } catch (caught) {
      notify(caught instanceof ApiError ? caught.message : 'No se pudo restaurar la propuesta.', 'error');
    }
  }

  async function confirmRemove() {
    const artwork = removing;
    setRemoving(null);
    const token = await browserSession.accessToken();
    if (!token || !artwork) {
      return;
    }
    try {
      const next = await artApi.removeFromGallery(token, artwork.lotId);
      setState({ status: 'ready', gallery: next });
      setPlacementDraft((current) => {
        const copy = new Map(current);
        copy.delete(artwork.id);
        return copy;
      });
      setSelectedId(null);
      setFocusId(null);
      notify(`${artwork.lot.title} salió de tu galería.`, 'success');
    } catch (caught) {
      notify(caught instanceof ApiError ? caught.message : 'No se pudo retirar la obra.', 'error');
    }
  }

  if (state.status === 'loading') {
    return <LoadingState label="Abriendo tu galería…" />;
  }
  if (state.status === 'error' || !gallery) {
    return <Notice tone="error">{state.status === 'error' ? state.message : 'No se pudo abrir la galería.'}</Notice>;
  }

  const focused = sceneArtworks.find((artwork) => artwork.id === focusId);
  const selected = gallery.artworks.find((artwork) => artwork.id === selectedId);

  return (
    <>
      <PageHeader
        eyebrow="Sala propia"
        title={gallery.name}
        description={config.identity.summary || 'Recorre tu sala, acércate a cada obra y ajusta el ambiente a tu gusto.'}
        actions={
          <ButtonLink href="/mi-galeria/personalizar" variant="secondary" icon={<Sparkles aria-hidden="true" className="h-4 w-4" />}>
            Diseñar con el asistente
          </ButtonLink>
        }
      />

      <div ref={viewport} className="relative h-[72vh] min-h-[28rem] scroll-mt-6 overflow-hidden rounded-panel border border-line bg-ink shadow-panel">
        <GalleryScene
          config={config}
          artworks={sceneArtworks}
          mode={mode}
          selectedId={selectedId}
          onSelect={onSelect}
          focus={focus}
          onLeaveFocus={() => { setFocusId(null); }}
          intent={intent}
          reducedMotion={reducedMotion}
        />

        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <div role="radiogroup" aria-label="Modo de la sala" className="pointer-events-auto inline-flex rounded-full bg-surface/95 p-1 shadow-panel">
            <ModeButton active={mode === 'tour'} onClick={() => { changeMode('tour'); }} icon={<Footprints aria-hidden="true" className="h-4 w-4" />}>
              Recorrer
            </ModeButton>
            <ModeButton active={mode === 'edit'} onClick={() => { changeMode('edit'); }} icon={<Move3d aria-hidden="true" className="h-4 w-4" />}>
              Editar montaje
            </ModeButton>
          </div>
          {mode === 'edit' && gallery.artworks.length > 0 ? (
            <Button variant="secondary" size="sm" className="pointer-events-auto shadow-panel" icon={<LayoutGrid aria-hidden="true" className="h-4 w-4" />} onClick={organize}>
              Organizar automáticamente
            </Button>
          ) : null}
        </div>

        {gallery.artworks.length === 0 ? (
          <div className="absolute inset-x-0 bottom-6 flex justify-center px-4">
            <div className="max-w-md rounded-panel bg-surface/95 p-5 text-center shadow-lift">
              <p className="font-serif text-xl">Tu sala está vacía</p>
              <p className="mt-1 text-sm text-muted">Las obras que ganes en subasta se cuelgan aquí solas.</p>
              <ButtonLink href="/catalogo" size="sm" className="mt-3">
                Ir al catálogo
              </ButtonLink>
            </div>
          </div>
        ) : null}

        {mode === 'tour' && gallery.artworks.length > 0 ? (
          <div className="absolute bottom-3 left-3 flex items-end gap-3">
            <TouchPad intent={intent} />
            <p className="hidden rounded-field bg-ink/70 px-3 py-2 text-xs text-paper md:block">
              Arrastra para mirar · WASD o flechas para caminar · clic en una obra para acercarte
            </p>
          </div>
        ) : null}

        {mode === 'edit' && !selected && gallery.artworks.length > 0 ? (
          <p className="absolute bottom-3 left-3 rounded-field bg-ink/70 px-3 py-2 text-xs text-paper">
            Elige una obra para moverla · arrastra para girar la vista
          </p>
        ) : null}

        <div className="absolute bottom-3 right-3 top-16 flex items-end justify-end">
          {mode === 'tour' && focused ? <ArtworkCard lot={focused.lot} onBack={() => { setFocusId(null); }} /> : null}
          {mode === 'edit' && selected ? (
            <PlacementPanel
              lot={selected.lot}
              placement={placementDraft.get(selected.id) ?? storedPlacement(selected)}
              size={artworkSize(selected.lot)}
              room={room}
              isObject={isObjectLot(selected.lot)}
              onChange={(next) => { setPlacement(selected.id, next); }}
              onRemove={() => { setRemoving(selected); }}
              onClose={() => { setSelectedId(null); }}
            />
          ) : null}
        </div>
      </div>

      {overlapping && mode === 'tour' ? (
        <Notice className="mt-4">
          Hay obras superpuestas. Entra en <strong>Editar montaje</strong> y usa <strong>Organizar automáticamente</strong>.
        </Notice>
      ) : null}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel as="section">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-2xl">Ambiente</h2>
            {gallery.suggestedConfig && !sameConfig(gallery.suggestedConfig, savedConfig) ? (
              <Button variant="ghost" onClick={() => void restore()}>
                Volver a la propuesta del asistente
              </Button>
            ) : null}
          </div>
          <div className="mt-4">
            <AmbiencePanel config={config} onChange={setConfigDraft} />
          </div>
        </Panel>
        <Panel as="section">
          <h2 className="font-serif text-2xl">Obras en la sala</h2>
          {gallery.artworks.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Aún no hay obras.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {gallery.artworks.map((artwork) => (
                <li key={artwork.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{artwork.lot.title}</span>
                    <span className="text-xs text-muted">{isObjectLot(artwork.lot) ? 'Sobre pedestal' : 'En la pared'}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 whitespace-nowrap"
                    onClick={() => {
                      // La sala vuelve a la vista para ver el viaje hasta la obra.
                      viewport.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
                      if (mode === 'tour') {
                        setFocusId(artwork.id);
                      } else {
                        setSelectedId(artwork.id);
                      }
                    }}
                  >
                    {mode === 'tour' ? 'Ir a la obra' : 'Editar'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {dirty ? (
        <div className="sticky bottom-4 z-30 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-surface/95 px-5 py-3 shadow-lift backdrop-blur">
          <p className="text-sm">
            <strong>Tienes cambios sin guardar</strong>
            <span className="text-muted">
              {' '}
              {[configDirty ? 'ambiente' : null, placementDraft.size > 0 ? `${String(placementDraft.size)} obra${placementDraft.size === 1 ? '' : 's'} movida${placementDraft.size === 1 ? '' : 's'}` : null]
                .filter(Boolean)
                .join(' y ')}
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={discard} disabled={saving}>
              Descartar
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              Guardar cambios
            </Button>
          </div>
          {error ? <Notice tone="error" className="w-full">{error}</Notice> : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        title="¿Retirar la obra de tu galería?"
        confirmLabel="Retirar"
        tone="danger"
        onConfirm={() => void confirmRemove()}
        onCancel={() => { setRemoving(null); }}
      >
        {removing ? `${removing.lot.title} dejará de verse en tu sala. Podrás volver a colgarla desde su ficha.` : null}
      </ConfirmDialog>
    </>
  );
}

function ModeButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-ink text-paper' : 'text-ink hover:bg-paper-deep'}`}
    >
      {icon}
      {children}
    </button>
  );
}
