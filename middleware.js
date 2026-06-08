import { NextResponse } from 'next/server';

export default async function middleware(req) {
  const url = req.nextUrl.clone();

  // Si no intenta entrar a /admin, que pase de largo
  if (!url.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Buscamos nuestra cookie manual e inequívoca
  const tieneSesion = req.cookies.get('session_secreta')?.value;

  // Si no existe, rebote inmediato al login
  if (!tieneSesion) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};