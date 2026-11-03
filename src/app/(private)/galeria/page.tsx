'use client';

import { Box, Eye, EyeOff, Images, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireSession } from '@/components/session/require-session';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { artApi } from '@/lib/api/client';
import type { GalleryItem } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { browserSession, type AccountProfile } from '@/lib/session/browser-session';
import { canShowGalleryItem } from '@/lib/visibility';

const SOURCE_LABEL: Record<GalleryItem['source'], string> = {
  GANADA: 'Ganada en subasta',
  PROPIA: 'Publicada por ti',
  GRATUITA: 'Añadida como prueba',
};

export default function CollectionPage() {
  return <RequireSession title="Entra para ver tu colección">{(profile) => <Collection profile={profile} />}</RequireSession>;
}

function Collection({ profile }: { profile: AccountProfile }) {
  const [items, setItems] = useState<GalleryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void browserSession.accessToken().then(async (token) => {
      if (!token) {
        return;
      }
      try {
        const rows = await artApi.gallery(profile.userId, token);
        setItems(rows.filter((item) => canShowGalleryItem(item, profile.userId)));
      } catch {
        setError('No se pudo abrir tu colección.');
      }
    });
  }, [profile.userId]);

  return (
    <>
      <PageHeader
        eyebrow="Tu cuenta"
        title="Mi colección"
        description="Las obras que ganaste o publicaste. Las públicas se ven en tu galería pública."
        actions={
          <>
            <ButtonLink href="/mi-galeria" icon={<Box aria-hidden="true" className="h-4 w-4" />}>
              Ver en la sala 3D
            </ButtonLink>
            <ButtonLink href={`/galerias/${profile.userId}`} variant="secondary" icon={<Share2 aria-hidden="true" className="h-4 w-4" />}>
              Mi galería pública
            </ButtonLink>
          </>
        }
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {!items && !error ? <LoadingState label="Abriendo tu colección…" /> : null}
      {items?.length === 0 ? (
        <EmptyState
          icon={<Images aria-hidden="true" className="h-6 w-6" />}
          title="Tu colección está vacía"
          description="Las obras que ganes en subasta llegan aquí y a tu sala 3D."
          action={<ButtonLink href="/catalogo">Ver salas en vivo</ButtonLink>}
        />
      ) : null}
      {items && items.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={`${item.lotId ?? item.title}-${item.acquiredAt}`} className="flex flex-col rounded-panel border border-line bg-surface p-5 shadow-panel">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-oxide">{SOURCE_LABEL[item.source]}</p>
              <h2 className="mt-2 font-serif text-xl leading-snug">
                {item.lotId ? (
                  <Link href={`/obras/${item.lotId}`} className="hover:underline">
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </h2>
              <p className="text-sm text-muted">{item.artistName ?? 'Artista sin atribuir'}</p>
              <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  {item.visibility === 'PUBLIC' ? <Eye aria-hidden="true" className="h-3.5 w-3.5" /> : <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />}
                  {item.visibility === 'PUBLIC' ? 'Pública' : 'Solo tú la ves'}
                </span>
                <time dateTime={item.acquiredAt}>{formatDateTime(item.acquiredAt)}</time>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
