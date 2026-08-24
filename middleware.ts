import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canAccess } from '@/lib/access';
import { resolveRole } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and API routes
  if (pathname === '/login' || pathname === '/api/login') {
    return NextResponse.next();
  }

  // Which password opened this session decides what it can reach. Enforced
  // here rather than in the pages, so a hidden tab is genuinely closed and
  // not merely undrawn — typing the URL has to fail too.
  const authCookie = request.cookies.get('auth_session');
  const role = await resolveRole(authCookie?.value);

  if (!role) {
    // If accessing API, return 401
    if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Otherwise redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Signed in, but not for this tool. Reports is the one page every role
  // holds, so it doubles as the landing spot for a client who typed a URL
  // they do not have — somewhere to act from, rather than a dead end.
  if (!canAccess(role, pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/reports', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
