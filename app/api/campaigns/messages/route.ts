import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET - Buscar mensagens de uma campanha (com erros)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const campaignId = request.nextUrl.searchParams.get('campaignId')
    const statusFilter = request.nextUrl.searchParams.get('status') // 'failed', 'sent', etc.

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId obrigatório' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    let query = serviceClient
      .from('campaign_messages')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('sent_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query.limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
