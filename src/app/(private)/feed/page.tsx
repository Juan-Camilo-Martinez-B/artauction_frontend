'use client';

import { Newspaper } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { RequireSession } from '@/components/session/require-session';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { artApi } from '@/lib/api/client';
import type { ActivityItem } from '@/lib/api/types';
import { describeActivity } from '@/lib/describe-events';
import { useEventText } from '@/hooks/use-event-text';
import { useFormat } from '@/hooks/use-format';
import { browserSession, type AccountProfile } from '@/lib/session/browser-session';

export default function FeedPage() {
  const t = useTranslations('Feed');
  return <RequireSession title={t('signInTitle')}>{(profile) => <Feed profile={profile} />}</RequireSession>;
}

function Feed({ profile }: { profile: AccountProfile }) {
  const t = useTranslations('Feed');
  const eventText = useEventText();
  const format = useFormat();
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void browserSession.accessToken().then(async (token) => {
      if (!token) {
        return;
      }
      try {
        setItems(await artApi.feed(token));
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
          icon={<Newspaper aria-hidden="true" className="h-6 w-6" />}
          title={t('empty.title')}
          description={t('empty.description')}
          action={<ButtonLink href="/catalogo" variant="secondary">{t('empty.action')}</ButtonLink>}
        />
      ) : null}
      {items && items.length > 0 ? (
        <ol className="max-w-3xl divide-y divide-line rounded-panel border border-line bg-surface shadow-panel">
          {items.map((item) => {
            const described = describeActivity(item, profile.userId);
            const text = eventText.activity(described.message);
            return (
              <li key={`${item.objectId}-${item.createdAt}`} className="flex items-baseline justify-between gap-4 px-5 py-4">
                <p>
                  <span className="font-medium">{described.actor === 'you' ? t('you') : t('followed')}</span>
                  <span className="text-muted"> · </span>
                  {described.href ? (
                    <Link href={described.href} className="underline-offset-4 hover:underline">
                      {text}
                    </Link>
                  ) : (
                    text
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
