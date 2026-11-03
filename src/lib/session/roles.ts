/** Roles que publican en el catalogo (auditoria y subasta). Cualquier cuenta crea proyectos propios. */
const SELLER_ROLES: ReadonlySet<string> = new Set(['SELLER', 'ADMIN']);

export function canSell(role: string): boolean {
  return SELLER_ROLES.has(role);
}
