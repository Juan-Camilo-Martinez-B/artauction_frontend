// Reglas de cuenta. Son espejo de identity-service (domain/account.ts): el
// servidor sigue siendo la autoridad; aqui solo se avisa antes de enviar.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 10;
const MAX_PASSWORD = 256;

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export function emailError(email: string): string | undefined {
  const value = email.trim();
  if (value === '') {
    return 'Escribe tu correo.';
  }
  if (value.length > 254 || !EMAIL.test(value)) {
    return 'Revisa el correo: debe tener la forma nombre@dominio.com.';
  }
  return undefined;
}

export function passwordError(password: string): string | undefined {
  if (password === '') {
    return 'Escribe tu contraseña.';
  }
  if (password.length < MIN_PASSWORD) {
    return `La contraseña debe tener al menos ${String(MIN_PASSWORD)} caracteres.`;
  }
  if (password.length > MAX_PASSWORD) {
    return 'La contraseña es demasiado larga.';
  }
  return undefined;
}

export function displayNameError(name: string): string | undefined {
  const value = name.trim();
  if (value.length < 2 || value.length > 80) {
    return 'El nombre debe tener entre 2 y 80 caracteres.';
  }
  return undefined;
}

export function validateLogin(values: { email: string; password: string }): FieldErrors<'email' | 'password'> {
  // Al entrar solo se exige que haya contrasena: la politica aplica al crearla.
  return {
    email: emailError(values.email),
    password: values.password === '' ? 'Escribe tu contraseña.' : undefined,
  };
}

export function validateRegistration(values: {
  displayName: string;
  email: string;
  password: string;
}): FieldErrors<'displayName' | 'email' | 'password'> {
  return {
    displayName: displayNameError(values.displayName),
    email: emailError(values.email),
    password: passwordError(values.password),
  };
}

export function hasErrors<Field extends string>(errors: FieldErrors<Field>): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}
