export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: ['/dashboard/:path*', '/schedule/:path*', '/settings/:path*'],
};
