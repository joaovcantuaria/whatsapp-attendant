import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { WHATSAPP_SERVER_URL, WHATSAPP_SERVER_API_KEY as API_KEY } from '@/lib/whatsapp-server'

export const dynamic = 'force-dynamic'

// Proxy para o servidor WhatsApp na VPS
// Resolve o problema de mixed content (HTTPS frontend → HTTP VPS)
async function proxyRequest(request: NextRequest, method: string) {
  try {
    // Verificar autenticação
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Extrair path após /api/whatsapp-server/
    const url = new URL(request.url)
    const path = url.pathname.replace('/api/whatsapp-server', '')

    const targetUrl = `${WHATSAPP_SERVER_URL}/api${path}`

    const options: RequestInit = {
      method,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }

    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const body = await request.json()
        options.body = JSON.stringify(body)
      } catch {
        // No body
      }
    }

    const response = await fetch(targetUrl, options)
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    return NextResponse.json({ error: 'Servidor não acessível', details: error.message }, { status: 502 })
  }
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, 'GET')
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, 'POST')
}
