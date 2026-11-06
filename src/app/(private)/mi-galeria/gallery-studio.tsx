'use client';

import { Footprints, LayoutGrid, Move3d, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArtworkCard } from '@/components/gallery3d/artwork-card';
import { AmbiencePanel } from '@/components/gallery3d/ambience-panel';
import type { SceneArtwork, SceneMode } from '@/components/gallery3d/gallery-scene';
import { LazyGalleryScene } from '@/components/gallery3d/lazy-gallery-scene';
import { PlacementPanel } from '@/components/gallery3d/placement-panel';
import { RequireSession } from '@/components/session/require-session';
import { TouchPad } from '@/components/gallery3d/touch-pad';
import type { MoveIntent, Viewpoint } from '@/components/gallery3d/tour-controls';
import { Button, ButtonLink } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingState, PageHeader, Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { useToast } from '@/components/ui/toast';
import { useErrorText } from '@/hooks/use-error-text';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { artApi } from '@/lib/api/client';
import type { GalleryConfig, PersonalGallery } from '@/lib/api/types';
import { DEFAULT_GALLERY_CONFIG, sameConfig } from '@/lib/gallery/default-config';
import { artworkSize, hangingPlan, hasOverlaps, isObjectLot, objectTop, roomOf, storedPlacement, viewpointFor, type Placement } from '@/lib/gallery/layout';
import { browserSession } from '@/lib/session/browser-session';
import { GalleryVisibility } from './gallery-visibility';

/** Nombre con que gallery-service crea cada sala; es el nombre por omision, no uno elegido. */
const DEFAULT_GALLERY_NAME = 'Mi galería';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; gallery: PersonalGallery };

type GalleryArtwork = PersonalGallery['artworks'][number];

function samePlacement(a: Placement, b: Placement): boolean {
  const close = (x: number, y: number) => Math.abs(x - y) < 1e-4;
  return close(a.posX, b.posX) && close(a.posY, b.posY) && close(a.posZ, b.posZ) && close(a.rotY, b.rotY) && close(a.scale, b.scale) && a.support === b.support;
}

export function GalleryStudio() {
  const t = useTranslations('Studio');
  return (
    <RequireSession title={t('signInTitle')} description={t('signInHint')}>
      {() => <Studio />}
    </RequireSession>
  );
}

function Studio() {
  const t = useTranslations('Studio');
  const locale = useLocale();
  const errorText = useErrorText();
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

  const loaded = useRef(false);
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
        const next = await artApi.myGallery(token);
        if (loaded.current) {
          // Cambio el idioma: llegan las fichas traducidas y los cambios sin guardar se conservan.
          setState({ status: 'ready', gallery: next });
        } else {
          loaded.current = true;
          adopt(next);
        }
      } catch (caught) {
        setState({ status: 'error', message: errorText(caught, t('loadFailed')) });
      }
    });
  }, [adopt, errorText, t, locale]);

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
    notify(next.size > 0 ? t('organized') : t('alreadyOrganized'), 'info');
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
      notify(t('saved'), 'success');
    } catch (caught) {
      setError(errorText(caught, t('saveFailed')));
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
      notify(t('restored'), 'success');
    } catch (caught) {
      notify(errorText(caught, t('restoreFailed')), 'error');
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
      notify(t('removed', { title: artwork.lot.title }), 'success');
    } catch (caught) {
      notify(errorText(caught, t('removeFailed')), 'error');
    }
  }

  if (state.status === 'loading') {
    return <LoadingState label={t('opening')} />;
  }
  if (state.status === 'error' || !gallery) {
    return <Notice tone="error">{state.status === 'error' ? state.message : t('loadFailed')}</Notice>;
  }

  const focused = sceneArtworks.find((artwork) => artwork.id === focusId);
  const selected = gallery.artworks.find((artwork) => artwork.id === selectedId);

  return (
    <>
      <PageHeader
        eyebrow={t('eyebrow')}
        title={gallery.name === DEFAULT_GALLERY_NAME ? t('defaultName') : gallery.name}
        description={config.identity.summary || t('description')}
        actions={
          <ButtonLink href="/mi-galeria/personalizar" variant="secondary" icon={<Sparkles aria-hidden="true" className="h-4 w-4" />}>
            {t('design')}
          </ButtonLink>
        }
      />

      {/* Cambiar quien la ve no toca los cambios de la sala sin guardar. */}
      <GalleryVisibility gallery={gallery} onChange={(next) => { setState({ status: 'ready', gallery: next }); }} />

      <div ref={viewport} className="relative h-[72vh] min-h-[28rem] scroll-mt-6 overflow-hidden rounded-panel border border-line bg-ink shadow-panel">
        <LazyGalleryScene
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
          <div role="radiogroup" aria-label={t('modeLabel')} className="pointer-events-auto inline-flex rounded-full bg-surface/95 p-1 shadow-panel">
            <ModeButton active={mode === 'tour'} onClick={() => { changeMode('tour'); }} icon={<Footprints aria-hidden="true" className="h-4 w-4" />}>
              {t('modeTour')}
            </ModeButton>
            <ModeButton active={mode === 'edit'} onClick={() => { changeMode('edit'); }} icon={<Move3d aria-hidden="true" className="h-4 w-4" />}>
              {t('modeEdit')}
            </ModeButton>
          </div>
          {mode === 'edit' && gallery.artworks.length > 0 ? (
            <Button variant="secondary" size="sm" className="pointer-events-auto shadow-panel" icon={<LayoutGrid aria-hidden="true" className="h-4 w-4" />} onClick={organize}>
              {t('organize')}
            </Button>
          ) : null}
        </div>

        {gallery.artworks.length === 0 ? (
          <div className="absolute inset-x-0 bottom-6 flex justify-center px-4">
            <div className="max-w-md rounded-panel bg-surface/95 p-5 text-center shadow-lift">
              <p className="font-serif text-xl">{t('empty.title')}</p>
              <p className="mt-1 text-sm text-muted">
                {t('empty.description')}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <ButtonLink href="/publicar" size="sm">
                  {t('empty.upload')}
                </ButtonLink>
                <ButtonLink href="/mis-obras" size="sm" variant="secondary">
                  {t('empty.myWorks')}
                </ButtonLink>
              </div>
            </div>
          </div>
        ) : null}

        {mode === 'tour' && gallery.artworks.length > 0 ? (
          <div className="absolute bottom-3 left-3 flex items-end gap-3">
            <TouchPad intent={intent} />
            <p className="hidden rounded-field bg-ink/70 px-3 py-2 text-xs text-paper md:block">
              {t('tourHint')}
            </p>
          </div>
        ) : null}

        {mode === 'edit' && !selected && gallery.artworks.length > 0 ? (
          <p className="absolute bottom-3 left-3 rounded-field bg-ink/70 px-3 py-2 text-xs text-paper">
            {t('editHint')}
          </p>
        ) : null}

        <div className="absolute bottom-3 right-3 top-16 flex items-end justify-end">
          {mode === 'tour' && focused ? <ArtworkCard lot={focused.lot} ownerId={gallery.ownerId} onBack={() => { setFocusId(null); }} /> : null}
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
          {t.rich('overlap', { strong: (chunks) => <strong>{chunks}</strong> })}
        </Notice>
      ) : null}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel as="section">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-2xl">{t('ambience.title')}</h2>
            {gallery.suggestedConfig && !sameConfig(gallery.suggestedConfig, savedConfig) ? (
              <Button variant="ghost" onClick={() => void restore()}>
                {t('restore')}
              </Button>
            ) : null}
          </div>
          <div className="mt-4">
            <AmbiencePanel config={config} onChange={setConfigDraft} />
          </div>
        </Panel>
        <Panel as="section">
          <h2 className="font-serif text-2xl">{t('works.title')}</h2>
          {gallery.artworks.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t('works.empty')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {gallery.artworks.map((artwork) => (
                <li key={artwork.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{artwork.lot.title}</span>
                    <span className="text-xs text-muted">{isObjectLot(artwork.lot) ? t('works.onPedestal') : t('works.onWall')}</span>
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
                    {mode === 'tour' ? t('works.goTo') : t('works.edit')}
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
            <strong>{t('unsaved.title')}</strong>
            <span className="text-muted">
              {' '}
              {[configDirty ? t('unsaved.ambience') : null, placementDraft.size > 0 ? t('unsaved.moved', { count: placementDraft.size }) : null]
                .filter(Boolean)
                .join(t('unsaved.and'))}
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={discard} disabled={saving}>
              {t('unsaved.discard')}
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              {t('unsaved.save')}
            </Button>
          </div>
          {error ? <Notice tone="error" className="w-full">{error}</Notice> : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        title={t('removeDialog.title')}
        confirmLabel={t('removeDialog.confirm')}
        tone="danger"
        onConfirm={() => void confirmRemove()}
        onCancel={() => { setRemoving(null); }}
      >
        {removing ? t('removeDialog.body', { title: removing.lot.title }) : null}
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
