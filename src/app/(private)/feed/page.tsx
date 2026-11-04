'use client';

import { Newspaper } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireSession } from '@/components/session/require-session';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { artApi } from '@/lib/api/client';
import type { ActivityItem } from '@/lib/api/types';
import { describeActivity } from '@/lib/describe-events';
import { useFormat } from '@/hooks/use-format';
import { browserSession, type AccountProfile } from '@/lib/session/browser-session';

export default function FeedPage() {
  return <RequireSession title="Entra para ver la actividad">{(profile) => <Feed profile={profile} />}</RequireSession>;
}

function Feed({ profile }: { profile: AccountProfile }) {
  const format = useFormat();
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void browserSession.accessToken().then(async (token) => {
      if (!token) {
        return;
      }
      try {
        setItems(await artApi.feed(token));
      } catch {
        setError('No se pudo cargar la actividad.');
      }
    });
  }, []);

  return (
    <>
      <PageHeader eyebrow="Comunidad" title="Actividad" description="Lo que pasa con tus obras y con las galerías que sigues." />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {!items && !error ? <LoadingState label="Cargando actividad…" /> : null}
      {items?.length === 0 ? (
        <EmptyState
          icon={<Newspaper aria-hidden="true" className="h-6 w-6" />}
          title="Aún no hay actividad"
          description="Gana una subasta o sigue la galería de otra persona y su actividad aparecerá aquí."
          action={<ButtonLink href="/catalogo" variant="secondary">Explorar el catálogo</ButtonLink>}
        />
      ) : null}
      {items && items.length > 0 ? (
        <ol className="max-w-3xl divide-y divide-line rounded-panel border border-line bg-surface shadow-panel">
          {items.map((item) => {
            const described = describeActivity(item, profile.userId);
            return (
              <li key={`${item.objectId}-${item.createdAt}`} className="flex items-baseline justify-between gap-4 px-5 py-4">
                <p>
                  <span className="font-medium">{described.who}</span>
                  <span className="text-muted"> · </span>
                  {described.href ? (
                    <Link href={described.href} className="underline-offset-4 hover:underline">
                      {described.text}
                    </Link>
                  ) : (
                    described.text
                  )}
                </p>
                <time dateTime={item.createdAt} title={format.dateTime(item.createdAt)} className="shrink-0 text-xs text-muted">
                  {format.relative(item.createdAt)}
                </time>
              </li>
            );
          })}
        </ol>
      ) : null}
    </>
  );
}
