const labels: Record<string, string> = {
  BORRADOR: 'Borrador',
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

export function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full border border-line px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
      {labels[status] ?? status}
    </span>
  );
}
