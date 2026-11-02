'use client';

import { useCallback, useState } from 'react';
import { hasErrors, type FieldErrors } from '@/lib/forms/validators';

/**
 * Muestra el error de un campo solo despues de que la persona lo abandona o
 * intenta enviar, para no regañar mientras escribe.
 */
export function useFormValidation<Field extends string>(errors: FieldErrors<Field>) {
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const touch = useCallback((field: Field) => {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
  }, []);

  const visibleError = (field: Field): string | undefined =>
    submitted || touched[field] ? errors[field] : undefined;

  /** Marca el intento de envio y dice si el formulario puede salir. */
  const attemptSubmit = (): boolean => {
    setSubmitted(true);
    return !hasErrors(errors);
  };

  return { touch, visibleError, attemptSubmit };
}
