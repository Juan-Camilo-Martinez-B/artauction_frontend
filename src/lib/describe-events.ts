import type { ActivityItem, NotificationItem } from '@/lib/api/types';

export type EventTone = 'success' | 'info' | 'warning';

/** Que paso, en datos: el texto lo pone useEventText en el idioma activo. */
export type NotificationMessage =
  | { kind: 'auditApproved' | 'auditManual' | 'lostBuyNow' | 'lost' | 'generic' }
  | { kind: 'auditDone'; verdict: string | null }
  | { kind: 'lotReturned'; title: string | null; reason: string | null }
  | { kind: 'boughtNow' | 'wonAuction' | 'soldBuyNow' | 'sold'; amount: string | null };

export interface EventDescription {
  message: NotificationMessage;
  href: string | null;
  tone: EventTone;
}

/** Aviso en datos: que paso, que significa y a donde ir. */
export function describeNotification(item: NotificationItem, userId: string): EventDescription {
  const lotId = item.payload['lotId'];
  const lotHref = lotId ? `/obras/${lotId}` : null;
  if (item.kind === 'AUDIT') {
    const verdict = item.payload['verdict'] ?? null;
    if (verdict === 'APROBADO') {
      return { message: { kind: 'auditApproved' }, href: lotHref, tone: 'success' };
    }
    if (verdict === 'REVISION_MANUAL') {
      return { message: { kind: 'auditManual' }, href: lotHref, tone: 'warning' };
    }
    return { message: { kind: 'auditDone', verdict }, href: lotHref, tone: 'info' };
  }
  if (item.kind === 'LOT_RETURNED') {
    return {
      message: { kind: 'lotReturned', title: item.payload['title'] ?? null, reason: item.payload['reason'] ?? null },
      href: lotId ? `/publicar/${lotId}` : '/mis-obras',
      tone: 'warning',
    };
  }
  const buyNow = item.payload['closedBy'] === 'BUY_NOW';
  if (item.kind === 'AUCTION_CLOSED') {
    const amount = item.payload['amount'] ?? null;
    if (item.payload['winnerId'] === userId) {
      return { message: { kind: buyNow ? 'boughtNow' : 'wonAuction', amount }, href: '/mi-galeria', tone: 'success' };
    }
    return { message: { kind: buyNow ? 'soldBuyNow' : 'sold', amount }, href: lotHref, tone: 'success' };
  }
  if (item.kind === 'AUCTION_LOST') {
    return { message: { kind: buyNow ? 'lostBuyNow' : 'lost' }, href: lotHref, tone: 'info' };
  }
  return { message: { kind: 'generic' }, href: null, tone: 'info' };
}

/** Hecho de la actividad; `other` conserva la frase tal como la guardo el backend. */
export type ActivityMessage =
  | { kind: 'followed' | 'boughtNow' | 'won'; name: string }
  | { kind: 'other'; text: string };

/**
 * gallery-service guarda cada actividad como una frase fija en espanol. Se
 * reconoce su forma para traducirla, tambien en la actividad ya guardada.
 */
export function activityMessage(summary: string): ActivityMessage {
  const followed = /^Siguió a (.+)$/.exec(summary);
  if (followed?.[1]) {
    return { kind: 'followed', name: followed[1] };
  }
  const bought = /^Compró (.+) al instante$/.exec(summary);
  if (bought?.[1]) {
    return { kind: 'boughtNow', name: bought[1] };
  }
  const won = /^Ganó (.+)$/.exec(summary);
  if (won?.[1]) {
    return { kind: 'won', name: won[1] };
  }
  return { kind: 'other', text: summary };
}

/** Actividad en datos, con enlace al objeto (obra o galeria de una persona). */
export function describeActivity(item: ActivityItem, userId: string): { actor: 'you' | 'followed'; message: ActivityMessage; href: string | null } {
  const href = item.objectType === 'LOT' ? `/obras/${item.objectId}` : item.objectType === 'USER' ? `/galerias/${item.objectId}` : null;
  return { actor: item.actorId === userId ? 'you' : 'followed', message: activityMessage(item.summary), href };
}
