import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { artApi } from '@/lib/api/client';

export async function POST() {
  const jar = await cookies();
  const current = jar.get('aa_refresh')?.value;
  if (!current) {
    return NextResponse.json({ error: 'No hay sesión' }, { status: 401 });
  }
  try {
    const tokens = await artApi.refresh(current);
    jar.set('aa_refresh', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });
    return NextResponse.json({ accessToken: tokens.accessToken });
  } catch {
    jar.delete('aa_refresh');
    return NextResponse.json({ error: 'La sesión expiró' }, { status: 401 });
  }
}
