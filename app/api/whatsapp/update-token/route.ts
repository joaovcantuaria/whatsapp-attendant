import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// POST - Atualizar apenas o token (sem validação de WABA para evitar falso negativo)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Buscar empresa do usuário
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    // Testar se o token é válido fazendo uma chamada simples
    const testRes = await fetch(
      `https://graph.facebook.com/v22.0/debug_token?input_token=${token}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const testData = await testRes.json()

    if (!testRes.ok || !testData.data?.is_valid) {
      return NextResponse.json({ 
        error: 'Token inválido', 
        details: testData 
      }, { status: 400 })
    }

    // Testar se consegue acessar WABAs
    const wabaRes = await fetch(
      `https://graph.facebook.com/v22.0/me/whatsapp_business_accounts?fields=id,name`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const wabaData = await wabaRes.json()

    // Testar acesso direto ao WABA
    let templateAccess = false
    let wabaId = null
    if (wabaRes.ok && wabaData.data?.length > 0) {
      wabaId = wabaData.data[0].id
      const tplRes = await fetch(
        `https://graph.facebook.com/v22.0/${wabaId}/message_templates?limit=1`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      templateAccess = tplRes.ok
    }

    // Salvar token no banco
    const updateData: any = {
      whatsapp_token: token,
      updated_at: new Date().toISOString(),
    }
    if (wabaId) {
      updateData.whatsapp_business_account_id = wabaId
    }

    const { error } = await serviceClient
      .from('companies')
      .update(updateData)
      .eq('id', member.company_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      token_info: {
        app_id: testData.data.app_id,
        type: testData.data.type,
        scopes: testData.data.scopes,
        is_valid: testData.data.is_valid,
        expires_at: testData.data.expires_at ? new Date(testData.data.expires_at * 1000).toISOString() : 'never',
      },
      waba_access: wabaRes.ok,
      wabas_found: wabaData.data || [],
      template_access: templateAccess,
      waba_id_saved: wabaId,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
