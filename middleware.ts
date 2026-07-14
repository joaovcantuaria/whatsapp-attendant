import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas públicas que não requerem autenticação
const publicRoutes = ['/login', '/register', '/pricing', '/invite', '/privacidade']
const publicPrefixes = ['/api/webhook', '/api/external']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas do webhook (não requerem auth)
  if (publicPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Landing page é pública
  if (pathname === '/') {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Rotas públicas
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Redirecionar para login se não autenticado
  if (!session && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // Redirecionar para dashboard se já autenticado em rotas de auth
  if (session && (pathname === '/login' || pathname === '/register')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/conversations'
    return NextResponse.redirect(redirectUrl)
  }

  // Proteger super-admin
  if (pathname.startsWith('/super-admin')) {
    if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/conversations'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.png|logo.png|icon.png|icon-topo.png|api/webhook|api/external).*)'],
}
