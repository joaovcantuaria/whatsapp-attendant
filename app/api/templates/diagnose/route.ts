import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Endpoint de diagnóstico para debug da sincronização de templates
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    const { data: company } = await serviceClient
      .from('companies')
      .select('whatsapp_token, whatsapp_business_account_id, whatsapp_phone_number_id, whatsapp_connected')
      .eq('id', member.company_id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 })
    }

    const results: Record<string, any> = {
      config: {
        whatsapp_connected: company.whatsapp_connected,
        has_token: !!company.whatsapp_token,
        token_prefix: company.whatsapp_token?.substring(0, 10) + '...',
        phone_number_id: company.whatsapp_phone_number_id,
        business_account_id: company.whatsapp_business_account_id,
      },
      tests: {}
    }

    if (!company.whatsapp_token) {
      results.diagnosis = 'Token não configurado'
      return NextResponse.json(results)
    }

    const token = company.whatsapp_token

    // Test 1: Token válido? (testar phone number)
    if (company.whatsapp_phone_number_id) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v22.0/${company.whatsapp_phone_number_id}?fields=display_phone_number,verified_name,quality_rating`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const data = await res.json()
        results.tests.phone_number_lookup = { status: res.status, data }
      } catch (e: any) {
        results.tests.phone_number_lookup = { error: e.message }
      }
    }

    // Test 2: Descobrir WABA via edge
    if (company.whatsapp_phone_number_id) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v22.0/${company.whatsapp_phone_number_id}/whatsapp_business_account`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const data = await res.json()
        results.tests.waba_edge = { status: res.status, data }
      } catch (e: any) {
        results.tests.waba_edge = { error: e.message }
      }
    }

    // Test 3: Descobrir WABA via fields
    if (company.whatsapp_phone_number_id) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v22.0/${company.whatsapp_phone_number_id}?fields=whatsapp_business_account`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const data = await res.json()
        results.tests.waba_fields = { status: res.status, data }
      } catch (e: any) {
        results.tests.waba_fields = { error: e.message }
      }
    }

    // Test 4: Listar templates com WABA salvo
    if (company.whatsapp_business_account_id) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v22.0/${company.whatsapp_business_account_id}/message_templates?limit=1`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const data = await res.json()
        results.tests.templates_with_saved_waba = { 
          status: res.status, 
          data,
          waba_used: company.whatsapp_business_account_id 
        }
      } catch (e: any) {
        results.tests.templates_with_saved_waba = { error: e.message }
      }
    }

    // Test 5: Verificar permissões do token via debug_token
    try {
      const res = await fetch(
        `https://graph.facebook.com/v22.0/debug_token?input_token=${token}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await res.json()
      results.tests.token_debug = { 
        status: res.status, 
        scopes: data.data?.scopes,
        app_id: data.data?.app_id,
        type: data.data?.type,
        is_valid: data.data?.is_valid,
        expires_at: data.data?.expires_at ? new Date(data.data.expires_at * 1000).toISOString() : 'never',
      }
    } catch (e: any) {
      results.tests.token_debug = { error: e.message }
    }

    // Test 6: Tentar com WABA ID 169083510203621 (descoberto via Meta Business UI)
    try {
      const res = await fetch(
        `https://graph.facebook.com/v22.0/169083510203621/message_templates?limit=1`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await res.json()
      results.tests.templates_with_known_waba = { 
        status: res.status, 
        data,
        waba_used: '169083510203621'
      }
    } catch (e: any) {
      results.tests.templates_with_known_waba = { error: e.message }
    }

    // Diagnóstico final
    const tokenDebug = results.tests.token_debug
    const scopes = tokenDebug?.scopes || []
    
    if (!scopes.includes('whatsapp_business_management')) {
      results.diagnosis = 'FALTA PERMISSÃO: O token não tem "whatsapp_business_management". Esta permissão é obrigatória para gerenciar templates. Gere um novo token via System Users no Meta Business com ambas permissões: whatsapp_business_messaging + whatsapp_business_management.'
      results.solution = 'Acesse business.facebook.com → Configurações → System Users → Selecione o user → Gerar Token → Marque whatsapp_business_management + whatsapp_business_messaging → Cole o novo token nas Configurações do WhatsApp.'
    } else if (results.tests.templates_with_saved_waba?.status === 200) {
      results.diagnosis = 'Tudo OK! O token tem permissão e o WABA está correto.'
    } else {
      results.diagnosis = 'Token tem permissão mas WABA ID pode estar incorreto. Verifique os testes acima.'
    }

    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
