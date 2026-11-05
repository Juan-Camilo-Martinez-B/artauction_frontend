'use client';

import { Bell, CircleAlert, CircleCheck, Info } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { RequireSession } from '@/components/session/require-session';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { artApi } from '@/lib/api/client';
import type { NotificationItem } from '@/lib/api/types';
import { describeNotification, type EventTone } from '@/lib/describe-events';
import { useEventText } from '@/hooks/use-event-text';
import { useFormat } from '@/hooks/use-format';
import { browserSession, type AccountProfile } from '@/lib/session/browser-session';

const TONE_ICON: Record<EventTone, { Icon: typeof Info; className: string }> = {
  success: { Icon: CircleCheck, className: 'bg-moss-tint text-moss' },
  warning: { Icon: CircleAlert, className: 'bg-ochre-tint text-ochre' },
  info: { Icon: Info, className: 'bg-paper-deep text-ink' },
};

export default function NotificationsPage() {
  const t = useTranslations('Notifications');
  return <RequireSession title={t('signInTitle')}>{(profile) => <Notifications profile={profile} />}</RequireSession>;
}

function Notifications({ profile }: { profile: AccountProfile }) {
  const t = useTranslations('Notifications');
  const eventText = useEventText();
  const format = useFormat();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void browserSession.accessToken().then(async (token) => {
      if (!token) {
        return;
      }
      try {
        const rows = await artApi.notifications(token);
        setItems([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      } catch {
        setFailed(true);
      }
    });
  }, []);

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      {failed ? <Notice tone="error">{t('loadFailed')}</Notice> : null}
      {!items && !failed ? <LoadingState label={t('loading')} /> : null}
      {items?.length === 0 ? (
        <EmptyState
          icon={<Bell aria-hidden="true" className="h-6 w-6" />}
          title={t('empty.title')}
          description={t('empty.description')}
          action={<ButtonLink href="/catalogo" variant="secondary">{t('empty.action')}</ButtonLink>}
        />
      ) : null}
      {items && items.length > 0 ? (
        <ul className="max-w-3xl space-y-3">
          {items.map((item) => {
            const described = describeNotification(item, profile.userId);
            const { Icon, className } = TONE_ICON[described.tone];
            const text = eventText.notification(described.message);
            const body = (
              <>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${className}`}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{text.title}</span>
                  <span className="block text-sm text-muted">{text.body}</span>
                </span>
                <time dateTime={item.createdAt} title={format.dateTime(item.createdAt)} className="shrink-0 text-xs text-muted">
                  {format.relative(item.createdAt)}
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
