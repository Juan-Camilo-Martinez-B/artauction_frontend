import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const refreshToken = typeof body === 'object' && body !== null && 'refreshToken' in body ? body.refreshToken : null;
  if (typeof refreshToken !== 'string' || refreshToken.length < 20) {
    return NextResponse.json({ error: 'Refresh token inválido' }, { status: 400 });
  }
  const jar = await cookies();
  jar.set('aa_refresh', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env['NODE_ENV'] === 'production',
    maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete('aa_refresh');
  return NextResponse.json({ ok: true });
}
