import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
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

    // Verificar se é admin
    const { data: currentAgent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (currentAgent?.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admins podem criar agentes' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, role = 'agent' } = body

    // Criar usuário via service role
    const serviceClient = createServiceRoleClient()
    const { data: authUser, error: authError } = await serviceClient.auth.admin.inviteUserByEmail(email)

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    if (!authUser.user) {
      return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
    }

    // Criar registro do agente
    const { data: agent, error } = await serviceClient
      .from('agents')
      .insert({
        id: authUser.user.id,
        name,
        email,
        role,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(agent)
  } catch (error) {
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

    const { data: currentAgent } = await supabase
      .from('agents')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (currentAgent?.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admins podem editar agentes' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    const { data, error } = await supabase
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
