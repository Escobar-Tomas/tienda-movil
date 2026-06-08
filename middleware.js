import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Interceptamos SOLO las rutas que intentan entrar al panel de administración
  if (pathname.startsWith('/admin')) {
    
    // Buscamos la cookie segura que generó nuestro authService
    const sessionCookie = request.cookies.get('sb_session');

    // 2. Si la cookie NO existe, lo pateamos a la pantalla de Login
    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Si tiene la cookie, lo dejamos pasar libremente
  return NextResponse.next();
}

// Configuramos el matcher para que el middleware se ejecute estrictamente donde lo necesitamos
export const config = {
  matcher: ['/admin/:path*'],
};