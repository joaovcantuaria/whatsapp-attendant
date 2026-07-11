import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET - Buscar pipeline com stages e deals
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

    // Buscar ou criar pipeline padrão
    let { data: pipeline } = await serviceClient
      .from('crm_pipelines')
      .select('*')
      .eq('company_id', member.company_id)
      .eq('is_default', true)
      .single()

    if (!pipeline) {
      // Criar pipeline padrão
      const { data: newPipeline } = await serviceClient
        .from('crm_pipelines')
        .insert({ company_id: member.company_id, name: 'Pipeline de Vendas', is_default: true })
        .select()
        .single()

      if (!newPipeline) return NextResponse.json({ error: 'Erro ao criar pipeline' }, { status: 500 })
      pipeline = newPipeline

      // Criar stages padrão
      const defaultStages = [
        { name: 'Novo Lead', position: 0, color: '#3b82f6' },
        { name: 'Contato Realizado', position: 1, color: '#f59e0b' },
        { name: 'Proposta Enviada', position: 2, color: '#8b5cf6' },
        { name: 'Negociação', position: 3, color: '#f97316' },
        { name: 'Fechado', position: 4, color: '#22c55e' },
      ]

      await serviceClient
        .from('crm_pipeline_stages')
        .insert(defaultStages.map(s => ({ ...s, pipeline_id: pipeline!.id })))
    }

    // Buscar stages
    const { data: stages } = await serviceClient
      .from('crm_pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipeline.id)
      .order('position', { ascending: true })

    // Buscar deals abertos
    const { data: deals } = await serviceClient
      .from('crm_deals')
      .select('*, contact:contacts(id, name, phone, profile_picture), agent:agents(id, name)')
      .eq('company_id', member.company_id)
      .eq('pipeline_id', pipeline.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      pipeline,
      stages: stages || [],
      deals: deals || [],
    })
  } catch (error) {
    console.error('CRM Pipeline GET Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar novo deal
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

    const body = await request.json()
    const { title, value, contact_id, stage_id, pipeline_id } = body

    const { data: deal, error } = await serviceClient
      .from('crm_deals')
      .insert({
        company_id: member.company_id,
        title,
        value: value || 0,
        contact_id: contact_id || null,
        stage_id,
        pipeline_id,
        agent_id: session.user.id,
        status: 'open',
      })
      .select('*, contact:contacts(id, name, phone), agent:agents(id, name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Registrar atividade
    await serviceClient.from('crm_activities').insert({
      company_id: member.company_id,
      contact_id: contact_id || null,
      deal_id: deal.id,
      agent_id: session.user.id,
      type: 'deal_created',
      content: `Negociação "${title}" criada`,
    })

    return NextResponse.json(deal)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - Mover deal de stage ou atualizar
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

    const body = await request.json()
    const { id, stage_id, status, lost_reason, ...updates } = body

    const updateData: any = { ...updates, updated_at: new Date().toISOString() }
    if (stage_id) updateData.stage_id = stage_id
    if (status) {
      updateData.status = status
      if (status === 'won' || status === 'lost') {
        updateData.closed_at = new Date().toISOString()
      }
      if (status === 'lost' && lost_reason) {
        updateData.lost_reason = lost_reason
      }
    }

    const { data: deal, error } = await serviceClient
      .from('crm_deals')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', member.company_id)
      .select('*, contact:contacts(id, name, phone), agent:agents(id, name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Registrar atividade
    let activityType = 'deal_moved'
    let content = 'Negociação atualizada'
    if (status === 'won') { activityType = 'deal_won'; content = `Negociação "${deal.title}" ganha!` }
    if (status === 'lost') { activityType = 'deal_lost'; content = `Negociação "${deal.title}" perdida. Motivo: ${lost_reason || 'não informado'}` }

    await serviceClient.from('crm_activities').insert({
      company_id: member.company_id,
      contact_id: deal.contact_id,
      deal_id: deal.id,
      agent_id: session.user.id,
      type: activityType,
      content,
    })

    return NextResponse.json(deal)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
