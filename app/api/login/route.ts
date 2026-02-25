import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/session';

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  const appPassword = process.env.APP_PASSWORD;

  if (password === appPassword) {
    const token = await getSessionToken();
    
    if (!token) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    
    // Set HTTP-only cookie
    response.cookies.set('auth_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return response;
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}
