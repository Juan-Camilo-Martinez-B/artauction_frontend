import type { InputHTMLAttributes, ReactNode } from 'react';

export function Field({
  label,
  hint,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string; error?: string }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="mb-1 block font-medium">{label}</span>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="w-full rounded-md border border-line bg-white px-3 py-2 text-ink"
        {...props}
      />
      {hint ? (
        <span id={`${id}-hint`} className="mt-1 block text-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className="mt-1 block text-oxide" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function TextArea({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="mb-1 block font-medium">{label}</span>
      <textarea
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        rows={5}
        className="w-full rounded-md border border-line bg-white px-3 py-2"
      />
    </label>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-oxide">
      {children}
    </p>
  );
}
