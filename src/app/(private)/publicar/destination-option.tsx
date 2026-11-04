import type { ReactNode } from 'react';

/** Opcion de una eleccion excluyente, como tarjeta: titulo, explicacion e icono. */
export function DestinationOption({
  selected,
  disabled = false,
  onSelect,
  icon,
  title,
  description,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`flex h-full flex-col items-start gap-1 rounded-field border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        selected ? 'border-ink bg-paper-deep' : 'border-line-strong bg-surface hover:border-ink'
      }`}
    >
      <span className="flex items-center gap-2 font-medium">
        {icon}
        {title}
      </span>
      <span className="text-sm text-muted">{description}</span>
    </button>
  );
}
