/**
 * Reglas de saneamiento de campos de texto.
 * - text: no puede empezar por espacios (nombres, titulos, descripciones).
 * - compact: no admite ningun espacio (correo, contrasena, codigos).
 * - none: se deja tal cual (campos con formato propio, como la tarjeta).
 */
export type SanitizeMode = 'text' | 'compact' | 'none';

export function sanitizeInput(value: string, mode: SanitizeMode): string {
  if (mode === 'compact') {
    return value.replace(/\s+/g, '');
  }
  if (mode === 'text') {
    return value.replace(/^\s+/, '');
  }
  return value;
}

/** Modo por defecto segun el tipo de input: correo, contrasena y URL no llevan espacios. */
export function defaultSanitizeMode(type: string | undefined): SanitizeMode {
  return type === 'email' || type === 'password' || type === 'url' ? 'compact' : 'text';
}

/**
 * Aplica una transformacion a lo escrito y calcula donde debe quedar el cursor.
 * La posicion se obtiene transformando solo el texto anterior al cursor, de modo
 * que borrar o insertar caracteres no lo manda al final.
 */
export function transformWithCaret(
  raw: string,
  caret: number | null,
  transform: (value: string) => string,
): { value: string; caret: number | null } {
  const value = transform(raw);
  if (caret === null) {
    return { value, caret: null };
  }
  return { value, caret: Math.min(transform(raw.slice(0, caret)).length, value.length) };
}
