import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// POST - Subscrever App ao WABA (necessário para acessar templates)
// GET - Verificar status da subscrição
export async function POST(request: NextRequest) {
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
      .select('whatsapp_token, whatsapp_business_account_id')
      .eq('id', member.company_id)
      .single()

    if (!company?.whatsapp_token || !company?.whatsapp_business_account_id) {
      return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 })
    }

    const wabaId = company.whatsapp_business_account_id
    const token = company.whatsapp_token
    const results: Record<string, any> = {}

    // 1. Tentar subscrever o App ao WABA
    try {
      const subRes = await fetch(
        `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`,
        { 
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      const subData = await subRes.json()
      results.subscribe = { status: subRes.status, data: subData }
    } catch (e: any) {
      results.subscribe = { error: e.message }
    }

    // 2. Verificar a subscrição
    try {
      const checkRes = await fetch(
        `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const checkData = await checkRes.json()
      results.check_subscription = { status: checkRes.status, data: checkData }
    } catch (e: any) {
      results.check_subscription = { error: e.message }
    }

    // 3. Tentar acessar templates após subscrição
    try {
      const templatesRes = await fetch(
        `https://graph.facebook.com/v22.0/${wabaId}/message_templates?limit=2`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const templatesData = await templatesRes.json()
      results.templates_after_subscribe = { status: templatesRes.status, data: templatesData }
    } catch (e: any) {
      results.templates_after_subscribe = { error: e.message }
    }

    // 4. Alternativa: tentar via Graph API com App Secret Proof (se disponível)
    // Tentar com outro approach - listar WABAs do business e ver se templates funcionam via lá
    try {
      const meRes = await fetch(
        `https://graph.facebook.com/v22.0/me/whatsapp_business_accounts?fields=id,name,message_template_namespace`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const meData = await meRes.json()
      results.me_wabas = { status: meRes.status, data: meData }

      // Se encontrou WABAs, tentar acessar templates de cada um
      if (meRes.ok && meData.data) {
        for (const waba of meData.data) {
          const tRes = await fetch(
            `https://graph.facebook.com/v22.0/${waba.id}/message_templates?limit=2`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          const tData = await tRes.json()
          results[`templates_via_${waba.id}`] = { status: tRes.status, data: tData, waba_name: waba.name }
        }
      }
    } catch (e: any) {
      results.me_wabas = { error: e.message }
    }

    const success = results.templates_after_subscribe?.status === 200
    return NextResponse.json({ 
      success,
      message: success ? 'App subscrito e templates acessíveis!' : 'Subscrição tentada mas templates ainda inacessíveis. Veja detalhes.',
      results 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
