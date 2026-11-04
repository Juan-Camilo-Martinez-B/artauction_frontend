'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { VALIDATION_VALUES, type AccountProblem, type FieldErrors } from '@/lib/forms/validators';

/** Traduce los problemas de los formularios de cuenta al idioma activo. */
export function useAccountErrors() {
  const t = useTranslations('Validation');
  return useCallback(
    <Field extends string>(errors: FieldErrors<Field, AccountProblem>): FieldErrors<Field> => {
      const translated: FieldErrors<Field> = {};
      for (const field of Object.keys(errors) as Field[]) {
        const problem: AccountProblem | undefined = errors[field];
        if (problem) {
          // Solo la longitud de la contrasena intercala un valor; next-intl tipa los parametros de cada texto.
          translated[field] = problem === 'passwordShort' ? t(problem, VALIDATION_VALUES) : t(problem);
        }
      }
      return translated;
    },
    [t],
  );
}
