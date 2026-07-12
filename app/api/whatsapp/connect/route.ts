import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

// POST - Testar e salvar credenciais WhatsApp
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, accessToken, phoneNumberId, businessAccountId } = body

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ error: 'Access Token e Phone Number ID são obrigatórios' }, { status: 400 })
    }

    // Testar conexão com a Meta
    const testResponse = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )

    if (!testResponse.ok) {
      const errorData = await testResponse.json()
      return NextResponse.json({
        error: 'Credenciais inválidas',
        details: errorData.error?.message || 'Não foi possível conectar à Meta API'
      }, { status: 400 })
    }

    const phoneData = await testResponse.json()

    // Descobrir WABA ID automaticamente a partir do Phone Number ID
    let wabaId = businessAccountId || null

    try {
      const wabaResponse = await fetch(
        `https://graph.facebook.com/v22.0/${phoneNumberId}/whatsapp_business_account`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )
      if (wabaResponse.ok) {
        const wabaData = await wabaResponse.json()
        if (wabaData.id) {
          wabaId = wabaData.id
        }
      }
    } catch (e) {
      // Se não conseguir descobrir, usa o que o usuário passou
      console.error('Could not auto-discover WABA ID:', e)
    }

    // Se não conseguiu descobrir e não foi fornecido, tenta fields
    if (!wabaId) {
      try {
        const phoneLookup = await fetch(
          `https://graph.facebook.com/v22.0/${phoneNumberId}?fields=whatsapp_business_account`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
        if (phoneLookup.ok) {
          const data = await phoneLookup.json()
          if (data.whatsapp_business_account?.id) {
            wabaId = data.whatsapp_business_account.id
          }
        }
      } catch (e) {
        console.error('Could not discover WABA via fields:', e)
      }
    }

    // Verificar se token tem permissão para templates (whatsapp_business_management)
    let hasTemplatePermission = false
    if (wabaId) {
      try {
        const templateTest = await fetch(
          `https://graph.facebook.com/v22.0/${wabaId}/message_templates?limit=1`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
        hasTemplatePermission = templateTest.ok
      } catch {
        // Não tem permissão
      }
    }

    // Salvar credenciais
    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient
      .from('companies')
      .update({
        whatsapp_token: accessToken,
        whatsapp_phone_number_id: phoneNumberId,
        whatsapp_business_account_id: wabaId,
        whatsapp_connected: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const warnings: string[] = []
    if (!wabaId) {
      warnings.push('WABA ID não detectado automaticamente. Templates podem não sincronizar.')
    }
    if (!hasTemplatePermission) {
      warnings.push('Token sem permissão whatsapp_business_management. Mensagens funcionam, mas templates não sincronizam. Gere um token com essa permissão via System Users.')
    }

    return NextResponse.json({
      success: true,
      phoneNumber: phoneData.display_phone_number || phoneNumberId,
      verifiedName: phoneData.verified_name || null,
      wabaId: wabaId,
      hasTemplatePermission,
      warnings: warnings.length > 0 ? warnings : undefined,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
