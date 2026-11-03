import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { artApi } from '@/lib/api/client';

// Sin cookie o con la sesion vencida se responde 204: un visitante anonimo no es
// un error, y un 401 aqui ensuciaba la consola en cada pagina publica.
export async function POST() {
  const jar = await cookies();
  const current = jar.get('aa_refresh')?.value;
  if (!current) {
    return new NextResponse(null, { status: 204 });
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
    return new NextResponse(null, { status: 204 });
  }
}
