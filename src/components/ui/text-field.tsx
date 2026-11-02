'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { defaultSanitizeMode, sanitizeInput, transformWithCaret, type SanitizeMode } from '@/lib/forms/sanitize';

// Tipos de input que admiten setSelectionRange; en email o number el navegador lo rechaza.
const CARET_TYPES = new Set(['text', 'password', 'search', 'tel', 'url']);

const controlClasses =
  'w-full rounded-field border bg-surface px-3 py-2.5 text-ink placeholder:text-muted/70 transition-colors ' +
  'focus:border-ink focus:outline-none disabled:bg-paper-deep disabled:text-muted';

function borderFor(error: string | undefined): string {
  return error ? 'border-oxide' : 'border-line-strong';
}

/** Etiqueta, pista y error comunes a todos los campos de formulario. */
export function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="block text-sm">
      <label htmlFor={id} className="mb-1.5 block font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-oxide" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  if (error) {
    return `${id}-error`;
  }
  return hint ? `${id}-hint` : undefined;
}

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'> & {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  hint?: string;
  error?: string;
  /** Regla de espacios; por defecto depende del tipo (ver defaultSanitizeMode). */
  sanitize?: SanitizeMode;
  /** Formato propio (por ejemplo, la mascara de la tarjeta). Reemplaza al saneamiento. */
  format?: (value: string) => string;
  /** Contenido al final del campo, dentro del borde (por ejemplo, un boton de icono). */
  trailing?: ReactNode;
};

export function TextField({
  id,
  label,
  value,
  onValueChange,
  hint,
  error,
  sanitize,
  format,
  trailing,
  type = 'text',
  className = '',
  ...props
}: TextFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const mode = sanitize ?? defaultSanitizeMode(type);
  const transform = format ?? ((raw: string) => sanitizeInput(raw, mode));

  // Despues de que React pinta el valor transformado, devuelve el cursor a su sitio.
  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    if (caret === null || !input.current || !CARET_TYPES.has(input.current.type)) {
      return;
    }
    input.current.setSelectionRange(caret, caret);
  }, [value]);

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const next = transformWithCaret(event.target.value, event.target.selectionStart, transform);
    pendingCaret.current = next.caret;
    onValueChange(next.value);
  }

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          ref={input}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={`${controlClasses} ${borderFor(error)} ${trailing ? 'pr-11' : ''} ${className}`}
          {...props}
        />
        {trailing ? <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div> : null}
      </div>
    </FieldShell>
  );
}

/** Campo de contrasena con boton para mostrar u ocultar lo escrito. */
export function PasswordField(props: Omit<TextFieldProps, 'type' | 'trailing' | 'sanitize' | 'format'>) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <TextField
      {...props}
      // Aun visible, la contrasena sigue sin admitir espacios.
      sanitize="compact"
      type={visible ? 'text' : 'password'}
      spellCheck={false}
      autoCapitalize="none"
      trailing={
        <button
          type="button"
          onClick={() => { setVisible((current) => !current); }}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          aria-controls={props.id}
          className="rounded-full p-2 text-muted hover:bg-paper-deep hover:text-ink"
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </button>
      }
    />
  );
}

export function TextAreaField({
  id,
  label,
  value,
  onValueChange,
  hint,
  error,
  rows = 5,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'id'> & {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  hint?: string;
  error?: string;
  rows?: number;
}) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(event) => { onValueChange(sanitizeInput(event.target.value, 'text')); }}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${controlClasses} ${borderFor(error)}`}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  children,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${controlClasses} ${borderFor(error)}`}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
