import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    // Buscar empresa do usuário
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json([])
    }

    // Buscar todos os membros da empresa
    const { data: members } = await serviceClient
      .from('company_members')
      .select('user_id, role')
      .eq('company_id', member.company_id)
      .eq('is_active', true)

    if (!members || members.length === 0) {
      return NextResponse.json([])
    }

    const userIds = members.map(m => m.user_id)

    // Buscar agentes
    const { data: agents, error } = await serviceClient
      .from('agents')
      .select('*')
      .in('id', userIds)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching agents:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(agents || [])
  } catch (error) {
    console.error('Agents API Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    // Verificar se é admin
    const { data: currentAgent } = await serviceClient
      .from('agents')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (currentAgent?.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admins podem criar agentes' }, { status: 403 })
    }

    // Buscar empresa
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, role = 'agent' } = body

    // Criar usuário via invite
    const { data: authUser, error: authError } = await serviceClient.auth.admin.inviteUserByEmail(email)

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    if (!authUser.user) {
      return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
    }

    // Criar registro do agente
    const { error: agentError } = await serviceClient
      .from('agents')
      .insert({
        id: authUser.user.id,
        name,
        email,
        role,
      })

    if (agentError) {
      console.error('Error creating agent:', agentError)
    }

    // Adicionar como membro da empresa
    const { error: memberError } = await serviceClient
      .from('company_members')
      .insert({
        company_id: member.company_id,
        user_id: authUser.user.id,
        role: role === 'admin' ? 'admin' : 'agent',
        is_active: true,
        invited_by: session.user.id,
      })

    if (memberError) {
      console.error('Error adding member:', memberError)
    }

    return NextResponse.json({ success: true, message: 'Convite enviado' })
  } catch (error) {
    console.error('Agent POST error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: currentAgent } = await serviceClient
      .from('agents')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (currentAgent?.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admins podem editar agentes' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    const { data, error } = await serviceClient
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
