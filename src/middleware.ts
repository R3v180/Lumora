import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Fix for ngrok + next-intl: strip the local port from the URL if forwarded by a proxy
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    request.headers.set('host', forwardedHost);
    request.nextUrl.host = forwardedHost;
    request.nextUrl.port = '';
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(es|en)/:path*'],
};

