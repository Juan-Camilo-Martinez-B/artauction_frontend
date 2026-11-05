// Reglas de cuenta. Son espejo de identity-service (domain/account.ts): el
// servidor sigue siendo la autoridad; aqui solo se avisa antes de enviar.
// Devuelven claves del diccionario Validation, no frases: el texto lo pone el
// componente en el idioma de quien escribe.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 10;
const MAX_PASSWORD = 256;

/** Valores que intercalan los textos de validacion ({min}, {max}...). */
export const VALIDATION_VALUES = { minPassword: MIN_PASSWORD } as const;

export type AccountProblem = 'emailRequired' | 'emailInvalid' | 'passwordRequired' | 'passwordShort' | 'passwordLong' | 'nameLength';

export type FieldErrors<Field extends string, Problem extends string = string> = Partial<Record<Field, Problem>>;

export function emailError(email: string): AccountProblem | undefined {
  const value = email.trim();
  if (value === '') {
    return 'emailRequired';
  }
  if (value.length > 254 || !EMAIL.test(value)) {
    return 'emailInvalid';
  }
  return undefined;
}

export function passwordError(password: string): AccountProblem | undefined {
  if (password === '') {
    return 'passwordRequired';
  }
  if (password.length < MIN_PASSWORD) {
    return 'passwordShort';
  }
  if (password.length > MAX_PASSWORD) {
    return 'passwordLong';
  }
  return undefined;
}

export function displayNameError(name: string): AccountProblem | undefined {
  const value = name.trim();
  if (value.length < 2 || value.length > 80) {
    return 'nameLength';
  }
  return undefined;
}

export function validateLogin(values: { email: string; password: string }): FieldErrors<'email' | 'password', AccountProblem> {
  // Al entrar solo se exige que haya contrasena: la politica aplica al crearla.
  return {
    email: emailError(values.email),
    password: values.password === '' ? 'passwordRequired' : undefined,
  };
}

export function validateRegistration(values: {
  displayName: string;
  email: string;
  password: string;
}): FieldErrors<'displayName' | 'email' | 'password', AccountProblem> {
  return {
    displayName: displayNameError(values.displayName),
    email: emailError(values.email),
    password: passwordError(values.password),
  };
}

/** Convierte los problemas de un formulario en textos, con la funcion del idioma activo. */
export function problemTexts<Field extends string, Problem extends string>(errors: FieldErrors<Field, Problem>, text: (problem: Problem) => string): FieldErrors<Field> {
  const translated: FieldErrors<Field> = {};
  for (const field of Object.keys(errors) as Field[]) {
    const problem: Problem | undefined = errors[field];
    if (problem) {
      translated[field] = text(problem);
    }
  }
  return translated;
}

export function hasErrors<Field extends string>(errors: FieldErrors<Field>): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}
