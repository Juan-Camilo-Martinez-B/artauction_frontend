import { artApi } from '@/lib/api/client';

// A quien sigue la sesion actual. Explorar pinta varios botones a la vez: todos
// comparten una sola peticion, y cada uno recuerda su cambio mientras dure la pagina.
let cached: { token: string; ids: Promise<ReadonlySet<string>> } | null = null;

export function followingOf(token: string): Promise<ReadonlySet<string>> {
  if (cached?.token !== token) {
    const ids = artApi.following(token).then((list): ReadonlySet<string> => new Set(list));
    // Un fallo no se guarda: el siguiente boton vuelve a intentarlo.
    ids.catch(() => {
      cached = null;
    });
    cached = { token, ids };
  }
  return cached.ids;
}

/** Tras seguir o dejar de seguir, la lista guardada ya no sirve. */
export function forgetFollowing(): void {
  cached = null;
}
