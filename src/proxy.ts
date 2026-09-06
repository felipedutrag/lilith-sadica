import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Routes to protect
  const isProtectedPath = pathname.startsWith('/dashboard') || pathname === '/'
  
  // Read our simple auth cookie set by the client
  const authToken = request.cookies.get('lilith_auth_token')

  if (isProtectedPath && !authToken) {
    // Se não tiver token e a rota for protegida, redirecionar para login
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  if (pathname === '/auth' && authToken) {
    // Se já estiver logado e tentar acessar o auth, vai pro dashboard
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
