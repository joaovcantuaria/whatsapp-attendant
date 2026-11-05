import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { membroAtual } from '@/lib/membro-atual'
import { valoresCamposValidos } from '@/lib/campos-personalizados'

export const dynamic = 'force-dynamic'

// GET - Perfil completo do contato
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const membro = await membroAtual()
    if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()

    // Buscar contato (só da empresa do usuário)
    const { data: contact } = await serviceClient
      .from('contacts')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', membro.companyId)
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
    const membro = await membroAtual()
    if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const body = await request.json().catch(() => ({}))

    // Só campos editáveis (antes aceitava qualquer coluna, inclusive company_id)
    const EDITAVEIS = ['name', 'email', 'notes', 'address', 'city', 'birthday', 'crm_stage', 'crm_company', 'origin_channel', 'tags']
    const atualizacao: Record<string, unknown> = Object.fromEntries(
      Object.entries(body).filter(([campo]) => EDITAVEIS.includes(campo))
    )
    if (body.custom_fields !== undefined) {
      const campos = await valoresCamposValidos(serviceClient, membro.companyId, body.custom_fields)
      if (!campos.ok) return NextResponse.json({ error: campos.erro }, { status: 400 })
      atualizacao.custom_fields = campos.valores
    }
    if (Object.keys(atualizacao).length === 0) return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })

    const { data, error } = await serviceClient
      .from('contacts')
      .update({ ...atualizacao, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('company_id', membro.companyId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
