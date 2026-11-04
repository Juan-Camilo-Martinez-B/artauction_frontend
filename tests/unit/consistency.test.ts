import { describe, expect, it } from 'vitest';
import { answerLabel } from '@/app/(private)/mi-galeria/personalizar/personaliza-form';
import { catalogHref } from '@/lib/catalog-href';
import { isActive } from '@/components/main-nav';
import type { Auction, Bid, NotificationItem } from '@/lib/api/types';
import { bidderLabels, mergeBid, nextMinimumBid, quickBids, roomPhase } from '@/lib/auction/room';
import { describeActivity, describeNotification } from '@/lib/describe-events';
import { formatRelative } from '@/lib/format';
import { loginHref, safeNextPath } from '@/lib/session/next-path';

const ME = 'a0000000-0000-4000-8000-000000000003';

describe('regreso tras entrar', () => {
  it('solo acepta rutas internas', () => {
    expect(safeNextPath('/bolsillo')).toBe('/bolsillo');
    expect(safeNextPath('/subasta/abc?x=1')).toBe('/subasta/abc?x=1');
    expect(safeNextPath('//evil.example.com')).toBeNull();
    expect(safeNextPath('https://evil.example.com')).toBeNull();
    expect(safeNextPath('/\\evil.example.com')).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });

  it('arma el enlace de entrar con el destino', () => {
    expect(loginHref('/bolsillo')).toBe('/entrar?next=%2Fbolsillo');
    expect(loginHref('/entrar')).toBe('/entrar');
  });
});

describe('navegación', () => {
  it('marca activa la sección y sus subrutas', () => {
    expect(isActive('/mi-galeria/personalizar', '/mi-galeria')).toBe(true);
    expect(isActive('/mi-galeria', '/mi-galeria')).toBe(true);
    expect(isActive('/mi-galeriax', '/mi-galeria')).toBe(false);
  });

  it('arma la URL del catálogo sin parámetros vacíos', () => {
    expect(catalogHref({})).toBe('/catalogo');
    expect(catalogHref({ query: 'óleo', representation: 'TWO_D', page: 2 })).toBe('/catalogo?q=%C3%B3leo&representation=TWO_D&page=2');
    expect(catalogHref({ category: 'pinturas', page: 1 })).toBe('/catalogo?category=pinturas');
  });
});

describe('avisos y actividad en palabras', () => {
  const notification = (kind: string, payload: Record<string, string | null>): NotificationItem => ({ userId: ME, kind, payload, createdAt: '2026-11-02T10:00:00Z', readAt: null });

  it('explica el resultado de la auditoría', () => {
    expect(describeNotification(notification('AUDIT', { lotId: 'l1', verdict: 'APROBADO' }), ME)).toMatchObject({ title: 'Tu obra pasó la auditoría', href: '/obras/l1', tone: 'success' });
    expect(describeNotification(notification('AUDIT', { lotId: 'l1', verdict: 'REVISION_MANUAL' }), ME).tone).toBe('warning');
  });

  it('distingue al ganador de quien vendió', () => {
    const closed = notification('AUCTION_CLOSED', { auctionId: 'a1', lotId: 'l1', winnerId: ME, amount: '450.00' });
    expect(describeNotification(closed, ME)).toMatchObject({ title: '¡Ganaste la subasta!', href: '/mi-galeria' });
    expect(describeNotification(closed, 'otra-persona').title).toBe('Vendiste una obra');
  });

  it('enlaza la actividad con la obra o la galería', () => {
    const base = { actorId: ME, verb: 'WIN', objectType: 'LOT', objectId: 'l1', visibility: 'PUBLIC', summary: 'Ganó Marina', createdAt: '' };
    expect(describeActivity(base, ME)).toEqual({ who: 'Tú', text: 'Ganó Marina', href: '/obras/l1' });
    expect(describeActivity({ ...base, actorId: 'x', objectType: 'USER', objectId: 'u2' }, ME)).toMatchObject({ who: 'Alguien que sigues', href: '/galerias/u2' });
  });

  it('muestra las fechas en tiempo relativo en el idioma activo', () => {
    const now = new Date('2026-11-02T12:00:00Z');
    expect(formatRelative('2026-11-02T11:55:00Z', 'es', now)).toBe('hace 5 minutos');
    expect(formatRelative('2026-11-02T14:00:00Z', 'es', now)).toBe('dentro de 2 horas');
    expect(formatRelative('2026-11-02T11:55:00Z', 'en', now)).toBe('5 minutes ago');
    expect(formatRelative('2026-11-02T14:00:00Z', 'en', now)).toBe('in 2 hours');
  });
});

describe('reglas de la sala', () => {
  const bid = (id: string, bidderId: string, amount: string, createdAt: string, active = true): Bid => ({ id, bidderId, amount, createdAt, active });
  const auction = (patch: Partial<Auction> = {}): Auction => ({
    id: 'a1',
    lotId: 'l1',
    startPrice: '300.00',
    currentPrice: '300.00',
    minIncrement: '15.00',
    startsAt: '2026-11-02T12:05:00Z',
    endsAt: '2026-11-02T12:30:00Z',
    status: 'PROGRAMADA',
    winnerId: null,
    bids: [],
    ...patch,
  });
  const at = (iso: string) => new Date(iso).getTime();

  it('sabe en qué momento está la sala', () => {
    expect(roomPhase(auction(), at('2026-11-02T12:00:00Z'))).toBe('upcoming');
    expect(roomPhase(auction(), at('2026-11-02T12:06:00Z'))).toBe('opening');
    expect(roomPhase(auction({ status: 'ACTIVA' }), at('2026-11-02T12:10:00Z'))).toBe('live');
    expect(roomPhase(auction({ status: 'ACTIVA' }), at('2026-11-02T12:31:00Z'))).toBe('closing');
    expect(roomPhase(auction({ status: 'CERRADA' }), at('2026-11-02T12:31:00Z'))).toBe('closed');
  });

  it('pide la salida si no hay pujas y el incremento si las hay', () => {
    expect(nextMinimumBid(auction())).toBe(300);
    expect(nextMinimumBid(auction({ currentPrice: '330.00', bids: [bid('b1', 'x', '330.00', '1')] }))).toBe(345);
    // Una puja retirada no cuenta.
    expect(nextMinimumBid(auction({ bids: [bid('b1', 'x', '330.00', '1', false)] }))).toBe(300);
    expect(quickBids(300, 15)).toEqual([300, 330, 375]);
  });

  it('nombra a los postores sin revelar quiénes son', () => {
    const labels = bidderLabels([bid('b2', 'y', '345', '2'), bid('b1', 'x', '330', '1'), bid('b3', ME, '360', '3')], ME);
    expect(labels.get('x')).toBe('Postor 1');
    expect(labels.get('y')).toBe('Postor 2');
    expect(labels.get(ME)).toBe('Tú');
  });

  it('agrega la puja en vivo sin duplicarla, la más reciente primero', () => {
    const first = bid('b1', 'x', '330', '2026-11-02T12:10:00Z');
    const second = bid('b2', 'y', '345', '2026-11-02T12:11:00Z');
    expect(mergeBid([first], second).map((item) => item.id)).toEqual(['b2', 'b1']);
    expect(mergeBid([second, first], second)).toHaveLength(2);
  });
});

describe('asistente de galería', () => {
  it('muestra la etiqueta de la respuesta, no su clave', () => {
    expect(answerLabel('artStyles', 'clasico')).toBe('Arte clásico');
    expect(answerLabel('artStyles', 'desconocido')).toBe('desconocido');
  });
});
