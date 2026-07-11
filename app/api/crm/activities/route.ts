import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// POST - Registrar atividade
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members').select('company_id')
      .eq('user_id', session.user.id).eq('is_active', true).single()
    if (!member) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

    const body = await request.json()
    const { contact_id, deal_id, type, content } = body

    const { data, error } = await serviceClient
      .from('crm_activities')
      .insert({
        company_id: member.company_id,
        agent_id: session.user.id,
        contact_id: contact_id || null,
        deal_id: deal_id || null,
        type,
        content,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
