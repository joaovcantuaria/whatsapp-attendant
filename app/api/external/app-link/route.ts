import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import {
  appLinkConfigurado, companyDaApiKey, consultarApp, criptografar, origemPermitida,
} from '@/lib/app-link'

export const dynamic = 'force-dynamic'

/**
 * /api/external/app-link — chamado pelo Bora Gerir App (Configurações → Chat)
 *
 * Headers: x-api-key (API key "bgc_..." da empresa no Chat)
 *
 * POST   { app_url, app_token, empresa_nome }  → vincula (ou revincula) a empresa do App
 * DELETE                                      → remove o vínculo
 * GET                                         → status do vínculo (testa o token no App)
 */

const naoAutorizado = () =>
  NextResponse.json({ error: 'API Key inválida ou inativa' }, { status: 401 })

export async function POST(request: NextRequest) {
  try {
    const companyId = await companyDaApiKey(request.headers.get('x-api-key'))
    if (!companyId) return naoAutorizado()

    if (!appLinkConfigurado()) {
      return NextResponse.json({ error: 'Integração com o App não configurada no Chat' }, { status: 503 })
    }

    const body = await request.json().catch(() => ({}))
    const { app_url, app_token, empresa_nome } = body

    if (typeof app_url !== 'string' || !origemPermitida(app_url)) {
      return NextResponse.json({ error: 'app_url não permitida' }, { status: 400 })
    }
    if (typeof app_token !== 'string' || !/^bga_[0-9a-f]{64}$/.test(app_token)) {
      return NextResponse.json({ error: 'app_token inválido' }, { status: 400 })
    }

    const { error } = await createServiceRoleClient()
      .from('app_links')
      .upsert({
        company_id: companyId,
        app_url: new URL(app_url).origin,
        app_token_enc: criptografar(app_token),
        empresa_nome: typeof empresa_nome === 'string' ? empresa_nome.slice(0, 200) : null,
        linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' })

    if (error) {
      console.error('app-link upsert error:', error)
      return NextResponse.json({ error: 'Erro ao salvar vínculo' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('app-link POST error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const companyId = await companyDaApiKey(request.headers.get('x-api-key'))
    if (!companyId) return naoAutorizado()

    await createServiceRoleClient().from('app_links').delete().eq('company_id', companyId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('app-link DELETE error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const companyId = await companyDaApiKey(request.headers.get('x-api-key'))
    if (!companyId) return naoAutorizado()

    const { data: link } = await createServiceRoleClient()
      .from('app_links')
      .select('app_url, empresa_nome, linked_at')
      .eq('company_id', companyId)
      .single()

    if (!link) return NextResponse.json({ linked: false })

    const ping = await consultarApp<{ ok: boolean }>(companyId, 'ping')
    return NextResponse.json({
      linked: true,
      valid: ping.ok,
      app_url: link.app_url,
      empresa_nome: link.empresa_nome,
      linked_at: link.linked_at,
      ...(ping.ok ? {} : { error: ping.erro }),
    })
  } catch (error) {
    console.error('app-link GET error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
