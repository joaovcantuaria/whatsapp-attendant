import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Cookies are set in the response
          },
          remove(name: string, options: CookieOptions) {
            // Cookies are removed in the response
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)
  }

  // Se é um convite, redirecionar para definir senha
  if (type === 'invite' || type === 'recovery') {
    return NextResponse.redirect(new URL('/set-password', requestUrl.origin))
  }

  // Redirect padrão para conversas
  return NextResponse.redirect(new URL('/conversations', requestUrl.origin))
}
