'use client';

import { Images, Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArtworkImage } from '@/components/artwork-image';
import { ArtworkCard } from '@/components/gallery3d/artwork-card';
import { FullscreenButton } from '@/components/gallery3d/fullscreen-button';
import type { SceneArtwork } from '@/components/gallery3d/gallery-scene';
import { LazyGalleryScene } from '@/components/gallery3d/lazy-gallery-scene';
import { TouchPad } from '@/components/gallery3d/touch-pad';
import type { MoveIntent } from '@/components/gallery3d/tour-controls';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { useErrorText } from '@/hooks/use-error-text';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { ApiError, artApi } from '@/lib/api/client';
import type { GalleryRoom } from '@/lib/api/types';
import { DEFAULT_GALLERY_CONFIG } from '@/lib/gallery/default-config';
import { artworkSize, isObjectLot, objectTop, roomOf, storedPlacement, viewpointFor } from '@/lib/gallery/layout';
import { browserSession, type SessionSnapshot } from '@/lib/session/browser-session';
import { GallerySocial } from './gallery-social';

type RoomState = { status: 'loading' } | { status: 'closed' } | { status: 'error'; message: string } | { status: 'ready'; room: GalleryRoom };

/**
 * La sala 3D de una galeria, en modo recorrido y sin nada que editar. Se pide en
 * el navegador con la sesion de quien mira: una galeria privada solo se abre a
 * su duena, y a ella se le muestra como la verian los visitantes.
 */
export function PublicRoom({ ownerId, followerCount, returnTo }: { ownerId: string; followerCount: number; returnTo: string }) {
  const t = useTranslations('PublicGallery');
  const tStudio = useTranslations('Studio');
  const locale = useLocale();
  const errorText = useErrorText();
  const [state, setState] = useState<RoomState>({ status: 'loading' });
  const [session, setSession] = useState<SessionSnapshot>(browserSession.current());
  const [focusId, setFocusId] = useState<string | null>(null);
  const intent = useRef<MoveIntent>({ forward: 0, turn: 0 });
  const viewport = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => browserSession.subscribe(setSession), []);
  useEffect(() => {
    void browserSession.restore();
  }, []);

  // Sin saber aun si hay sesion, una galeria privada pareceria cerrada a su duena.
  const sessionKnown = session.status !== 'unknown';
  useEffect(() => {
    if (!sessionKnown) {
      return;
    }
    const effect = { active: true };
    void (async () => {
      try {
        const room = await artApi.galleryRoom(ownerId, await browserSession.accessToken());
        if (effect.active) {
          setState({ status: 'ready', room });
        }
      } catch (caught) {
        if (effect.active) {
          setState(caught instanceof ApiError && caught.status === 404 ? { status: 'closed' } : { status: 'error', message: errorText(caught, t('roomFailed')) });
        }
      }
    })();
    return () => {
      effect.active = false;
    };
  }, [ownerId, sessionKnown, locale, errorText, t]);

  const room = state.status === 'ready' ? state.room : null;
  const config = room?.appliedConfig ?? DEFAULT_GALLERY_CONFIG;
  const sceneArtworks = useMemo<SceneArtwork[]>(
    () => (room?.artworks ?? []).map((artwork) => ({ id: artwork.id, lot: artwork.lot, placement: storedPlacement(artwork) })),
    [room],
  );
  const focused = sceneArtworks.find((artwork) => artwork.id === focusId);
  const focus = useMemo(() => {
    if (!focused) {
      return null;
    }
    const size = artworkSize(focused.lot);
    return viewpointFor(focused.placement, size, roomOf(config), isObjectLot(focused.lot) ? objectTop(size, focused.placement.scale) : undefined);
  }, [focused, config]);

  if (state.status === 'loading') {
    return <LoadingState label={t('opening')} />;
  }
  if (state.status === 'closed') {
    return <EmptyState icon={<Lock aria-hidden="true" className="h-6 w-6" />} title={t('closed.title')} description={t('closed.description')} />;
  }
  if (state.status === 'error' || !room) {
    return <Notice tone="error">{state.status === 'error' ? state.message : t('roomFailed')}</Notice>;
  }

  const isOwner = session.profile?.userId === ownerId;
  const works = room.artworks;

  return (
    <>
      {isOwner ? (
        <Notice className="mb-4">
          {room.visibility === 'PUBLIC' ? t('ownerPublic') : t('ownerPrivate')}{' '}
          <ButtonLink href="/mi-galeria" variant="ghost" size="sm">
            {t('manage')}
          </ButtonLink>
        </Notice>
      ) : null}
      <div className="mb-6">
        <GallerySocial ownerId={ownerId} workCount={works.length} followerCount={followerCount} returnTo={returnTo} />
      </div>
      {works.length === 0 ? (
        <EmptyState
          icon={<Images aria-hidden="true" className="h-6 w-6" />}
          title={t('empty.title')}
          description={isOwner ? t('empty.owner') : t('empty.description')}
        />
      ) : (
        <>
          <div ref={viewport} className="relative h-[72vh] min-h-[28rem] scroll-mt-6 overflow-hidden rounded-panel border border-line bg-ink shadow-panel fullscreen:rounded-none fullscreen:border-0">
            <LazyGalleryScene
              config={config}
              artworks={sceneArtworks}
              mode="tour"
              selectedId={null}
              onSelect={setFocusId}
              focus={focus}
              onLeaveFocus={() => { setFocusId(null); }}
              intent={intent}
              reducedMotion={reducedMotion}
            />
            <FullscreenButton target={viewport} className="absolute right-3 top-3 shadow-panel" />
            <div className="absolute bottom-3 left-3 flex items-end gap-3">
              <TouchPad intent={intent} />
              <p className="hidden rounded-field bg-ink/70 px-3 py-2 text-xs text-paper md:block">{tStudio('tourHint')}</p>
            </div>
            <div className="absolute bottom-3 right-3 top-16 flex items-end justify-end">
              {focused ? <ArtworkCard lot={focused.lot} ownerId={ownerId} onBack={() => { setFocusId(null); }} /> : null}
            </div>
          </div>
          <section className="mt-8">
            <h2 className="font-serif text-2xl">{t('worksTitle')}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {works.map((artwork) => (
                <li key={artwork.id}>
                  <button
                    type="button"
                    className="group flex w-full items-center gap-3 rounded-field border border-line bg-surface p-2 text-left transition-colors hover:border-ink"
                    onClick={() => {
                      // La sala vuelve a la vista para ver el viaje hasta la obra.
                      viewport.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
                      setFocusId(artwork.id);
                    }}
                  >
                    <span className="block h-14 w-14 shrink-0 overflow-hidden rounded-field bg-paper">
                      <ArtworkImage src={artwork.lot.images?.[0]?.url ?? null} alt="" cover />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium group-hover:underline">{artwork.lot.title}</span>
                      <span className="block truncate text-xs text-muted">{artwork.lot.artistName ?? t('unattributedArtist')}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
