'use client';

import { useTranslations } from 'next-intl';
import { useStatusLabel } from '@/components/status-pill';
import type { ActivityMessage, NotificationMessage } from '@/lib/describe-events';
import { useFormat } from './use-format';

/** Pone en palabras del idioma activo los avisos y la actividad. */
export function useEventText() {
  const t = useTranslations('Events');
  const format = useFormat();
  const statusLabel = useStatusLabel();

  function notification(message: NotificationMessage): { title: string; body: string } {
    switch (message.kind) {
      case 'auditDone':
        return {
          title: t('auditDone.title'),
          body: message.verdict ? t('auditDone.result', { verdict: statusLabel(message.verdict) }) : t('auditDone.noResult'),
        };
      case 'lotReturned':
        return {
          title: message.title ? t('lotReturned.title', { title: message.title }) : t('lotReturned.genericTitle'),
          body: message.reason ? t('lotReturned.reason', { reason: message.reason }) : t('lotReturned.noReason'),
        };
      case 'boughtNow':
      case 'wonAuction':
      case 'soldBuyNow':
      case 'sold': {
        const amount = format.artacoins(message.amount);
        return { title: t(`${message.kind}.title`), body: t(`${message.kind}.body`, { amount }) };
      }
      default:
        return { title: t(`${message.kind}.title`), body: t(`${message.kind}.body`) };
    }
  }

  function activity(message: ActivityMessage): string {
    return message.kind === 'other' ? message.text : t(`activity.${message.kind}`, { name: message.name });
  }

  return { notification, activity };
}
