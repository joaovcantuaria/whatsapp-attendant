import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { gerarApiKey, hashCodigo, redirectUriPermitida } from '@/lib/app-link'

export const dynamic = 'force-dynamic'

const NOME_API_KEY = 'Bora Gerir App'

/**
 * POST /api/app-link/authorize — chamado pela tela /conectar-app quando o dono clica em "Autorizar"
 * Body: { redirect_uri, state, code_challenge }
 * Gera um código de uso único (5 min) e devolve a URL de volta para o App.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { redirect_uri, state, code_challenge } = await request.json().catch(() => ({}))
    if (!redirectUriPermitida(redirect_uri)) {
      return NextResponse.json({ error: 'redirect_uri não permitida' }, { status: 400 })
    }
    if (typeof state !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(state)) {
      return NextResponse.json({ error: 'state inválido' }, { status: 400 })
    }
    if (typeof code_challenge !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(code_challenge)) {
      return NextResponse.json({ error: 'code_challenge inválido' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const { data: membro } = await serviceClient
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!membro) return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    if (membro.role !== 'owner' && membro.role !== 'admin') {
      return NextResponse.json({ error: 'Só o dono ou um administrador pode conectar o Bora Gerir App' }, { status: 403 })
    }

    // Reaproveita a API key da integração se já existir (reconexão não acumula chaves)
    let { data: apiKey } = await serviceClient
      .from('api_keys')
      .select('id')
      .eq('company_id', membro.company_id)
      .eq('name', NOME_API_KEY)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (!apiKey) {
      const { data: nova, error } = await serviceClient
        .from('api_keys')
        .insert({ company_id: membro.company_id, name: NOME_API_KEY, key: gerarApiKey() })
        .select('id')
        .single()
      if (error || !nova) return NextResponse.json({ error: 'Erro ao gerar a chave da integração' }, { status: 500 })
      apiKey = nova
    }

    const codigo = crypto.randomBytes(32).toString('base64url')
    const { error } = await serviceClient.from('app_link_codes').insert({
      code_hash: hashCodigo(codigo),
      company_id: membro.company_id,
      api_key_id: apiKey.id,
      code_challenge,
      redirect_uri,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    })
    if (error) {
      console.error('app-link authorize insert error:', error)
      return NextResponse.json({ error: 'Erro ao gerar autorização' }, { status: 500 })
    }

    const volta = new URL(redirect_uri)
    volta.searchParams.set('code', codigo)
    volta.searchParams.set('state', state)
    return NextResponse.json({ redirect_to: volta.toString() })
  } catch (error) {
    console.error('app-link authorize error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
