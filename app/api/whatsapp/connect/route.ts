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

    if (!accessToken || !phoneNumberId || !businessAccountId) {
      return NextResponse.json({ error: 'Todas as credenciais são obrigatórias' }, { status: 400 })
    }

    // Testar conexão com a Meta
    const testResponse = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}`,
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

    // Salvar credenciais
    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient
      .from('companies')
      .update({
        whatsapp_token: accessToken,
        whatsapp_phone_number_id: phoneNumberId,
        whatsapp_business_account_id: businessAccountId,
        whatsapp_connected: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      phoneNumber: phoneData.display_phone_number || phoneNumberId,
      verifiedName: phoneData.verified_name || null,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
