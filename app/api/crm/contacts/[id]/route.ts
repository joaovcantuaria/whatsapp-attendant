import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET - Perfil completo do contato
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()

    // Buscar contato
    const { data: contact } = await serviceClient
      .from('contacts')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!contact) return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })

    // Buscar deals do contato
    const { data: deals } = await serviceClient
      .from('crm_deals')
      .select('*, stage:crm_pipeline_stages(name, color), agent:agents(name)')
      .eq('contact_id', params.id)
      .order('created_at', { ascending: false })

    // Buscar atividades
    const { data: activities } = await serviceClient
      .from('crm_activities')
      .select('*, agent:agents(name)')
      .eq('contact_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50)

    // Buscar compras
    const { data: purchases } = await serviceClient
      .from('crm_purchases')
      .select('*')
      .eq('contact_id', params.id)
      .order('date', { ascending: false })

    // Buscar tarefas
    const { data: tasks } = await serviceClient
      .from('crm_tasks')
      .select('*, agent:agents(name)')
      .eq('contact_id', params.id)
      .order('due_date', { ascending: true })

    // Buscar conversas
    const { data: conversations } = await serviceClient
      .from('conversations')
      .select('id, status, last_message, last_message_at, created_at')
      .eq('contact_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Calcular métricas
    const totalSpent = purchases?.reduce((sum, p) => sum + Number(p.value), 0) || 0
    const purchaseCount = purchases?.length || 0
    const avgTicket = purchaseCount > 0 ? totalSpent / purchaseCount : 0

    // Status do cliente (ativo/inativo/em risco)
    const lastInteraction = activities?.[0]?.created_at || conversations?.[0]?.last_message_at || contact.updated_at
    const daysSinceLastInteraction = lastInteraction
      ? Math.floor((Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    let clientStatus = 'active'
    if (daysSinceLastInteraction > 60) clientStatus = 'inactive'
    else if (daysSinceLastInteraction > 30) clientStatus = 'at_risk'

    return NextResponse.json({
      contact,
      deals: deals || [],
      activities: activities || [],
      purchases: purchases || [],
      tasks: tasks || [],
      conversations: conversations || [],
      metrics: {
        totalSpent,
        purchaseCount,
        avgTicket: Math.round(avgTicket * 100) / 100,
        daysSinceLastInteraction,
        clientStatus,
      },
    })
  } catch (error) {
    console.error('Contact profile error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - Atualizar contato
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const body = await request.json()

    const { data, error } = await serviceClient
      .from('contacts')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
