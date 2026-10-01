import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

const allowed = new Set(['catalog', 'gallery']);

export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidate-secret');
  if (!process.env['REVALIDATE_SECRET'] || secret !== process.env['REVALIDATE_SECRET']) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const body: unknown = await request.json();
  const tag = typeof body === 'object' && body !== null && 'tag' in body ? body.tag : null;
  if (typeof tag !== 'string' || (!allowed.has(tag) && !tag.startsWith('gallery:'))) {
    return NextResponse.json({ error: 'Tag inválido' }, { status: 400 });
  }
  revalidateTag(tag);
  return NextResponse.json({ revalidated: tag });
}
