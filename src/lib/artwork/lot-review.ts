import type { AuditSummary, Lot } from '@/lib/api/types';

/** Modelo con el que ai-service marca su evaluacion local, sin IA. */
const LOCAL_MODEL = 'local-rules';

/** Obra en borrador porque un administrador la devolvio con un motivo. */
export function isReturned(lot: Pick<Lot, 'status' | 'lastReview'>): boolean {
  return lot.status === 'BORRADOR' && lot.lastReview?.decision === 'RETURN_TO_DRAFT';
}

/** Estado que ve el vendedor: una obra devuelta se distingue de un borrador nuevo. */
export function sellerStatus(lot: Pick<Lot, 'status' | 'lastReview'>): string {
  return isReturned(lot) ? 'DEVUELTA' : lot.status;
}

/**
 * Quien evaluo la obra, en palabras. Si un administrador la aprobo despues de
 * la auditoria, eso es lo que cuenta para quien la mira.
 */
export function auditSourceLabel(summary: Pick<AuditSummary, 'modelName'> | undefined, lot: Pick<Lot, 'lastReview' | 'status'>): string | null {
  if (lot.lastReview?.decision === 'APPROVE' && lot.status !== 'BORRADOR') {
    return 'Aprobada por revisión manual de un administrador';
  }
  if (!summary) {
    return null;
  }
  switch (summary.modelName) {
    case LOCAL_MODEL:
      return 'Evaluación local (sin IA): la IA no estaba disponible';
    case 'rules':
      return 'Decidió una regla del sistema';
    case 'fallback':
      return 'La auditoría automática no terminó';
    default:
      return `Evaluada por la IA (${summary.modelName})`;
  }
}
