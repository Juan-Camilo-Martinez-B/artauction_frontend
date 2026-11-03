'use client';

import { Bell, CircleAlert, CircleCheck, Info } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireSession } from '@/components/session/require-session';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { artApi } from '@/lib/api/client';
import type { NotificationItem } from '@/lib/api/types';
import { describeNotification, type EventTone } from '@/lib/describe-events';
import { formatDateTime, formatRelative } from '@/lib/format';
import { browserSession, type AccountProfile } from '@/lib/session/browser-session';

const TONE_ICON: Record<EventTone, { Icon: typeof Info; className: string }> = {
  success: { Icon: CircleCheck, className: 'bg-moss-tint text-moss' },
  warning: { Icon: CircleAlert, className: 'bg-ochre-tint text-ochre' },
  info: { Icon: Info, className: 'bg-paper-deep text-ink' },
};

export default function NotificationsPage() {
  return <RequireSession title="Entra para ver tus avisos">{(profile) => <Notifications profile={profile} />}</RequireSession>;
}

function Notifications({ profile }: { profile: AccountProfile }) {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void browserSession.accessToken().then(async (token) => {
      if (!token) {
        return;
      }
      try {
        const rows = await artApi.notifications(token);
        setItems([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      } catch {
        setError('No se pudieron cargar los avisos.');
      }
    });
  }, []);

  return (
    <>
      <PageHeader eyebrow="Tu cuenta" title="Avisos" description="Resultados de tus auditorías y de las subastas en las que participaste." />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {!items && !error ? <LoadingState label="Cargando avisos…" /> : null}
      {items?.length === 0 ? (
        <EmptyState
          icon={<Bell aria-hidden="true" className="h-6 w-6" />}
          title="Sin avisos por ahora"
          description="Cuando termine una auditoría o cierre una subasta en la que participes, lo verás aquí."
          action={<ButtonLink href="/catalogo" variant="secondary">Ver salas en vivo</ButtonLink>}
        />
      ) : null}
      {items && items.length > 0 ? (
        <ul className="max-w-3xl space-y-3">
          {items.map((item) => {
            const described = describeNotification(item, profile.userId);
            const { Icon, className } = TONE_ICON[described.tone];
            const body = (
              <>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${className}`}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{described.title}</span>
                  <span className="block text-sm text-muted">{described.body}</span>
                </span>
                <time dateTime={item.createdAt} title={formatDateTime(item.createdAt)} className="shrink-0 text-xs text-muted">
                  {formatRelative(item.createdAt)}
                </time>
              </>
            );
            return (
              <li key={`${item.kind}-${item.createdAt}`}>
                {described.href ? (
                  <Link href={described.href} className="flex items-start gap-4 rounded-panel border border-line bg-surface p-4 shadow-panel transition-shadow hover:shadow-lift">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-4 rounded-panel border border-line bg-surface p-4 shadow-panel">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}
