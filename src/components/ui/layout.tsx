import type { ReactNode } from 'react';

/** Encabezado comun de cada pagina: antetitulo, titulo, descripcion y acciones. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div className="max-w-2xl">
        {eyebrow ? <p className="text-xs font-medium uppercase tracking-[0.22em] text-oxide">{eyebrow}</p> : null}
        <h1 className="mt-1 font-serif text-4xl leading-tight md:text-5xl">{title}</h1>
        {description ? <div className="mt-3 text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

/** Bloque con fondo claro y borde, para agrupar contenido o formularios. */
export function Panel({ children, className = '', as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <Tag className={`rounded-panel border border-line bg-surface p-6 shadow-panel ${className}`}>{children}</Tag>;
}

/** Estado vacio: explica por que no hay nada y ofrece el siguiente paso. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-panel border border-dashed border-line-strong px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-muted">{icon}</div> : null}
      <p className="font-serif text-2xl">{title}</p>
      {description ? <div className="mt-2 max-w-md text-sm text-muted">{description}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Indicador de carga en linea, anunciado a lectores de pantalla. */
export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <p role="status" className="flex items-center gap-3 py-10 text-muted">
      <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-oxide" />
      {label}
    </p>
  );
}
