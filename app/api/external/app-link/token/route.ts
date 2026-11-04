import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { desafioPkce, hashCodigo } from '@/lib/app-link'

export const dynamic = 'force-dynamic'

/**
 * POST /api/external/app-link/token — chamado pelo servidor do Bora Gerir App no callback
 * Body: { code, code_verifier, redirect_uri }
 * Troca o código de uso único (PKCE S256) pela API key "bgc_..." da empresa.
 */
const invalido = () => NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 400 })

export async function POST(request: NextRequest) {
  try {
    const { code, code_verifier, redirect_uri } = await request.json().catch(() => ({}))
    if (typeof code !== 'string' || typeof code_verifier !== 'string' || typeof redirect_uri !== 'string') {
      return invalido()
    }
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(code_verifier)) return invalido()

    const serviceClient = createServiceRoleClient()

    // Marca como usado numa única operação: dois pedidos com o mesmo código não passam
    const { data: registro } = await serviceClient
      .from('app_link_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('code_hash', hashCodigo(code))
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .select('api_key_id, code_challenge, redirect_uri')
      .maybeSingle()

    if (!registro) return invalido()
    if (registro.redirect_uri !== redirect_uri || registro.code_challenge !== desafioPkce(code_verifier)) {
      return invalido()
    }

    const { data: apiKey } = await serviceClient
      .from('api_keys')
      .select('key, is_active')
      .eq('id', registro.api_key_id)
      .single()

    if (!apiKey?.is_active) return invalido()
    return NextResponse.json({ api_key: apiKey.key })
  } catch (error) {
    console.error('app-link token error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
