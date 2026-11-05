import { describe, expect, it } from 'vitest';
import type { NotificationItem } from '@/lib/api/types';
import { auditSource, isReturned, sellerStatus } from '@/lib/artwork/lot-review';
import { describeNotification } from '@/lib/describe-events';

const RETURNED = { decision: 'RETURN_TO_DRAFT' as const, reason: 'Corrige las medidas declaradas.', createdAt: null };

describe('ciclo de revision en la interfaz', () => {
  it('una obra devuelta se distingue de un borrador nuevo', () => {
    expect(isReturned({ status: 'BORRADOR', lastReview: RETURNED })).toBe(true);
    expect(sellerStatus({ status: 'BORRADOR', lastReview: RETURNED })).toBe('DEVUELTA');
    expect(sellerStatus({ status: 'BORRADOR', lastReview: null })).toBe('BORRADOR');
    // Ya reenviada: deja de estar devuelta aunque la ultima revision lo diga.
    expect(sellerStatus({ status: 'PENDIENTE_AUDITORIA', lastReview: RETURNED })).toBe('PENDIENTE_AUDITORIA');
  });

  it('dice quien evaluo la obra sin confundir la evaluacion local con la IA', () => {
    const published = { status: 'PUBLICADA', lastReview: null };
    expect(auditSource({ modelName: 'local-rules' }, published)).toEqual({ kind: 'localRules' });
    expect(auditSource({ modelName: 'openai/gpt-oss-120b' }, published)).toEqual({ kind: 'ai', model: 'openai/gpt-oss-120b' });
    expect(auditSource({ modelName: 'fallback' }, published)).toEqual({ kind: 'unfinished' });
    const approved = { status: 'PUBLICADA', lastReview: { decision: 'APPROVE' as const, reason: null, createdAt: null } };
    expect(auditSource({ modelName: 'local-rules' }, approved)).toEqual({ kind: 'manualApproval' });
    expect(auditSource(undefined, published)).toBeNull();
  });

  it('el aviso de obra devuelta muestra el motivo y lleva a editarla', () => {
    const item: NotificationItem = {
      userId: 'u1',
      kind: 'LOT_RETURNED',
      payload: { lotId: 'l1', title: 'Retrato', reason: 'Corrige las medidas declaradas.' },
      createdAt: '2026-11-03T00:00:00Z',
      readAt: null,
    };
    expect(describeNotification(item, 'u1')).toEqual({
      message: { kind: 'lotReturned', title: 'Retrato', reason: 'Corrige las medidas declaradas.' },
      href: '/publicar/l1',
      tone: 'warning',
    });
  });
});
