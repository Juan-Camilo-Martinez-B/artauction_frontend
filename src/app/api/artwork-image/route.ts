import { parseProxiedImageUrl } from '@/lib/gallery/image-source';

// Proxy de imagenes para las texturas de la sala 3D. Solo sirve hosts de la
// lista de image-source.ts (evita SSRF), no sigue redirecciones, exige un tipo
// de imagen y corta las respuestas grandes.

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function fail(status: number, message: string): Response {
  return new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function GET(request: Request): Promise<Response> {
  const target = parseProxiedImageUrl(new URL(request.url).searchParams.get('src'));
  if (!target) {
    return fail(400, 'Imagen no permitida.');
  }
  let upstream: Response;
  try {
    upstream = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return fail(504, 'El origen de la imagen no respondió.');
  }
  const type = (upstream.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (upstream.status !== 200 || !IMAGE_TYPES.has(type) || !upstream.body) {
    return fail(502, 'El origen no devolvió una imagen.');
  }
  const declared = Number(upstream.headers.get('content-length') ?? '0');
  if (declared > MAX_BYTES) {
    return fail(413, 'La imagen es demasiado grande.');
  }
  const body = await readLimited(upstream.body, MAX_BYTES);
  if (!body) {
    return fail(413, 'La imagen es demasiado grande.');
  }
  return new Response(body, {
    headers: {
      'content-type': type,
      'content-length': String(body.byteLength),
      // Las imagenes del Met no cambian: el navegador las guarda un dia.
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** Lee el cuerpo completo sin pasar de `limit` bytes; null si lo supera. */
async function readLimited(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array<ArrayBuffer> | null> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(new ArrayBuffer(size));
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
