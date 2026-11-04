import type { ActivityItem, NotificationItem } from '@/lib/api/types';
import { formatArtacoins } from '@/lib/auction/policy';

export type EventTone = 'success' | 'info' | 'warning';

export interface EventDescription {
  title: string;
  body: string;
  href: string | null;
  tone: EventTone;
}

/** Aviso en palabras: que paso, que significa y a donde ir. */
export function describeNotification(item: NotificationItem, userId: string): EventDescription {
  const lotHref = item.payload['lotId'] ? `/obras/${item.payload['lotId']}` : null;
  if (item.kind === 'AUDIT') {
    const verdict = item.payload['verdict'];
    if (verdict === 'APROBADO') {
      return { title: 'Tu obra pasó la auditoría', body: 'Ya está publicada en el catálogo y recibirá su sala de subasta.', href: lotHref, tone: 'success' };
    }
    if (verdict === 'REVISION_MANUAL') {
      return { title: 'Tu obra quedó en revisión manual', body: 'La auditoría encontró algo que debe mirar una persona. Te avisaremos al resolverla.', href: lotHref, tone: 'warning' };
    }
    return { title: 'Terminó la auditoría de tu obra', body: verdict ? `Resultado: ${verdict.toLowerCase()}.` : 'Revisa la ficha para ver el resultado.', href: lotHref, tone: 'info' };
  }
  if (item.kind === 'LOT_RETURNED') {
    const reason = item.payload['reason'];
    const title = item.payload['title'] ?? 'Tu obra';
    return {
      title: `${title} volvió a borrador`,
      body: reason ? `Motivo: ${reason} Corrígela y reenvíala a auditoría.` : 'Un administrador la devolvió. Corrígela y reenvíala a auditoría.',
      href: item.payload['lotId'] ? `/publicar/${item.payload['lotId']}` : '/mis-obras',
      tone: 'warning',
    };
  }
  if (item.kind === 'AUCTION_CLOSED') {
    const amount = formatArtacoins(item.payload['amount']);
    const buyNow = item.payload['closedBy'] === 'BUY_NOW';
    if (item.payload['winnerId'] === userId) {
      return buyNow
        ? { title: 'Compraste ahora', body: `Pagaste ${amount} y la subasta terminó. La obra ya cuelga en tu galería.`, href: '/mi-galeria', tone: 'success' }
        : { title: '¡Ganaste la subasta!', body: `Pagaste ${amount}. La obra ya cuelga en tu galería.`, href: '/mi-galeria', tone: 'success' };
    }
    return buyNow
      ? { title: 'Vendiste por compra inmediata', body: `Alguien pagó ${amount} y cerró la subasta. El pago, menos la comisión, ya está en tu bolsillo.`, href: lotHref, tone: 'success' }
      : { title: 'Vendiste una obra', body: `La subasta cerró en ${amount}. El pago, menos la comisión, ya está en tu bolsillo.`, href: lotHref, tone: 'success' };
  }
  if (item.kind === 'AUCTION_LOST') {
    const buyNow = item.payload['closedBy'] === 'BUY_NOW';
    return {
      title: buyNow ? 'La obra se vendió por compra inmediata' : 'La subasta cerró con otro ganador',
      body: 'Ya no compites por ella. Lo que tenías retenido volvió a tu bolsillo.',
      href: lotHref,
      tone: 'info',
    };
  }
  return { title: 'Aviso', body: 'Hay novedades en tu cuenta.', href: null, tone: 'info' };
}

/** Actividad en palabras, con enlace al objeto (obra o galeria de una persona). */
export function describeActivity(item: ActivityItem, userId: string): { who: string; text: string; href: string | null } {
  const who = item.actorId === userId ? 'Tú' : 'Alguien que sigues';
  const href = item.objectType === 'LOT' ? `/obras/${item.objectId}` : item.objectType === 'USER' ? `/galerias/${item.objectId}` : null;
  return { who, text: item.summary, href };
}
