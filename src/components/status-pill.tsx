import { useTranslations } from 'next-intl';

// Mismo significado de color en todo el sitio: oxido = en vivo, verde = lista, ocre = en espera.
const tones: Record<string, string> = {
  ACTIVA: 'border-oxide/40 bg-oxide-tint text-oxide',
  EN_SUBASTA: 'border-oxide/40 bg-oxide-tint text-oxide',
  PUBLICADA: 'border-moss/30 bg-moss-tint text-moss',
  APROBADO: 'border-moss/30 bg-moss-tint text-moss',
  PROGRAMADA: 'border-ochre/30 bg-ochre-tint text-ochre',
  PENDIENTE_AUDITORIA: 'border-ochre/30 bg-ochre-tint text-ochre',
  REVISION_MANUAL: 'border-ochre/30 bg-ochre-tint text-ochre',
  DEVUELTA: 'border-oxide/40 bg-oxide-tint text-oxide',
  PERSONAL: 'border-ink/30 bg-paper-deep text-ink',
};

/** Estados con texto en el diccionario Status (la lista y el diccionario se verifican al compilar). */
const STATUSES = [
  'BORRADOR',
  'DEVUELTA',
  'PERSONAL',
  'PENDIENTE_AUDITORIA',
  'APROBADO',
  'PUBLICADA',
  'REVISION_MANUAL',
  'EN_SUBASTA',
  'VENDIDA',
  'CERRADO',
  'ACTIVA',
  'PROGRAMADA',
  'CERRADA',
] as const;

function isStatus(value: string): value is (typeof STATUSES)[number] {
  return (STATUSES as readonly string[]).includes(value);
}

/** Texto de un estado en el idioma activo; un estado desconocido se muestra tal cual. */
export function useStatusLabel(): (status: string) => string {
  const t = useTranslations('Status');
  return (status) => (isStatus(status) ? t(status) : status);
}

export function StatusPill({ status }: { status: string }) {
  const statusLabel = useStatusLabel();
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${tones[status] ?? 'border-line text-muted'}`}>
      {statusLabel(status)}
    </span>
  );
}
