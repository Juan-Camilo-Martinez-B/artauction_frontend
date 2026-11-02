import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  // Accion principal de la pantalla: una sola por vista.
  primary: 'bg-ink text-paper hover:bg-ink-soft',
  // Acciones con dinero o de compromiso (pagar, ofertar, enviar a auditoria).
  accent: 'bg-oxide text-white hover:bg-oxide-deep',
  secondary: 'border border-line-strong bg-surface text-ink hover:border-ink',
  ghost: 'text-ink underline-offset-4 hover:underline',
  danger: 'border border-oxide/40 bg-surface text-oxide hover:bg-oxide-tint',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = ''): string {
  const padding = variant === 'ghost' ? 'px-1 py-1 text-sm' : sizes[size];
  return `${base} ${variants[variant]} ${padding} ${extra}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra un indicador y bloquea el boton mientras la accion esta en curso. */
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
};

/** Enlace con el aspecto de un boton, para navegar sin perder la consistencia visual. */
export function ButtonLink({ variant = 'primary', size = 'md', icon, className = '', children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
