import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { companyId } = await request.json()

    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient
      .from('companies')
      .update({
        whatsapp_token: null,
        whatsapp_phone_number_id: null,
        whatsapp_business_account_id: null,
        whatsapp_connected: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
