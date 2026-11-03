const labels: Record<string, string> = {
  BORRADOR: 'Borrador',
  DEVUELTA: 'Devuelta',
  PENDIENTE_AUDITORIA: 'En auditoría',
  APROBADO: 'Aprobada',
  PUBLICADA: 'Publicada',
  REVISION_MANUAL: 'Revisión manual',
  EN_SUBASTA: 'En subasta',
  VENDIDA: 'Vendida',
  CERRADO: 'Cerrada',
  ACTIVA: 'Sala abierta',
  PROGRAMADA: 'Programada',
  CERRADA: 'Cerrada',
};

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
};

export function statusLabel(status: string): string {
  return labels[status] ?? status;
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${tones[status] ?? 'border-line text-muted'}`}>
      {statusLabel(status)}
    </span>
  );
}
