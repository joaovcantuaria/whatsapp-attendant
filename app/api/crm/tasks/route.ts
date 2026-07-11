import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET - Listar tarefas
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members').select('company_id')
      .eq('user_id', session.user.id).eq('is_active', true).single()
    if (!member) return NextResponse.json([])

    const status = request.nextUrl.searchParams.get('status')
    const today = request.nextUrl.searchParams.get('today')

    let query = serviceClient
      .from('crm_tasks')
      .select('*, contact:contacts(id, name, phone), deal:crm_deals(id, title), agent:agents(id, name)')
      .eq('company_id', member.company_id)
      .order('due_date', { ascending: true })

    if (status && status !== 'all') query = query.eq('status', status)
    if (today === 'true') {
      const todayStr = new Date().toISOString().split('T')[0]
      query = query.lte('due_date', todayStr).in('status', ['pending', 'in_progress'])
    }

    const { data } = await query
    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar tarefa
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
    const { title, description, contact_id, deal_id, due_date, priority } = body

    const { data, error } = await serviceClient
      .from('crm_tasks')
      .insert({
        company_id: member.company_id,
        agent_id: session.user.id,
        title,
        description: description || null,
        contact_id: contact_id || null,
        deal_id: deal_id || null,
        due_date: due_date || null,
        priority: priority || 'medium',
        status: 'pending',
      })
      .select('*, contact:contacts(id, name), agent:agents(id, name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - Atualizar tarefa
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const body = await request.json()
    const { id, ...updates } = body

    if (updates.status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await serviceClient
      .from('crm_tasks')
      .update(updates)
      .eq('id', id)
      .select('*, contact:contacts(id, name), agent:agents(id, name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
