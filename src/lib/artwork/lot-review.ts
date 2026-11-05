import type { AuditSummary, Lot } from '@/lib/api/types';

/** Modelo con el que ai-service marca su evaluacion local, sin IA. */
const LOCAL_MODEL = 'local-rules';

/** Proyecto propio: solo para la galeria de su autor, sin auditoria ni subasta. */
export function isPersonal(lot: Pick<Lot, 'status'>): boolean {
  return lot.status === 'PERSONAL';
}

/** El autor puede cambiar ficha e imagen: en borrador o en un proyecto propio. */
export function isEditable(lot: Pick<Lot, 'status'>): boolean {
  return lot.status === 'BORRADOR' || lot.status === 'PERSONAL';
}

/** Obra en borrador porque un administrador la devolvio con un motivo. */
export function isReturned(lot: Pick<Lot, 'status' | 'lastReview'>): boolean {
  return lot.status === 'BORRADOR' && lot.lastReview?.decision === 'RETURN_TO_DRAFT';
}

/** Estado que ve el vendedor: una obra devuelta se distingue de un borrador nuevo. */
export function sellerStatus(lot: Pick<Lot, 'status' | 'lastReview'>): string {
  return isReturned(lot) ? 'DEVUELTA' : lot.status;
}

/** Quien evaluo la obra; el componente lo pone en palabras del idioma activo. */
export type AuditSource =
  | { kind: 'personal' | 'manualApproval' | 'localRules' | 'systemRule' | 'unfinished' }
  | { kind: 'ai'; model: string };

/**
 * Quien evaluo la obra. Si un administrador la aprobo despues de la auditoria,
 * eso es lo que cuenta para quien la mira.
 */
export function auditSource(summary: Pick<AuditSummary, 'modelName'> | undefined, lot: Pick<Lot, 'lastReview' | 'status'>): AuditSource | null {
  if (isPersonal(lot)) {
    return { kind: 'personal' };
  }
  if (lot.lastReview?.decision === 'APPROVE' && lot.status !== 'BORRADOR') {
    return { kind: 'manualApproval' };
  }
  if (!summary) {
    return null;
  }
  switch (summary.modelName) {
    case LOCAL_MODEL:
      return { kind: 'localRules' };
    case 'rules':
      return { kind: 'systemRule' };
    case 'fallback':
      return { kind: 'unfinished' };
    default:
      return { kind: 'ai', model: summary.modelName };
  }
}
