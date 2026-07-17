import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const WHATSAPP_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://169.58.36.33:3001'
const WHATSAPP_SERVER_API_KEY = process.env.WHATSAPP_SERVER_API_KEY || 'boragerir-whatsapp-server-2026'

// Proxy para o WhatsApp Server na VPS
async function proxyRequest(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Verificar autenticação
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const path = params.path.join('/')
    const targetUrl = `${WHATSAPP_SERVER_URL}/api/${path}`

    const headers: Record<string, string> = {
      'x-api-key': WHATSAPP_SERVER_API_KEY,
    }

    let body: string | undefined
    if (request.method !== 'GET') {
      headers['Content-Type'] = 'application/json'
      body = await request.text()
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    return NextResponse.json({ error: 'Servidor não acessível' }, { status: 502 })
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context)
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context)
}
