import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

// GET - Buscar mensagens do chat da equipe ou agentes online
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    // Buscar company do usuario
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })
    }

    const action = request.nextUrl.searchParams.get('action')

    if (action === 'online') {
      // Buscar agentes online
      const { data: members } = await serviceClient
        .from('company_members')
        .select('user_id')
        .eq('company_id', member.company_id)
        .eq('is_active', true)

      const userIds = members?.map(m => m.user_id) || []

      const { data: agents } = await serviceClient
        .from('agents')
        .select('id, name, avatar_url')
        .in('id', userIds.length > 0 ? userIds : ['none'])
        .eq('is_online', true)

      return NextResponse.json({
        agents: agents?.map(a => ({ id: a.id, name: a.name, avatar: a.avatar_url })) || [],
      })
    }

    // Buscar mensagens do chat (últimas 100)
    const { data: messages } = await serviceClient
      .from('team_messages')
      .select(`
        id,
        agent_id,
        content,
        created_at,
        agents:agent_id(name, avatar_url)
      `)
      .eq('company_id', member.company_id)
      .order('created_at', { ascending: true })
      .limit(100)

    const formattedMessages = messages?.map((msg: any) => ({
      id: msg.id,
      agent_id: msg.agent_id,
      agent_name: msg.agents?.name || 'Unknown',
      agent_avatar: msg.agents?.avatar_url || null,
      content: msg.content,
      created_at: msg.created_at,
    })) || []

    return NextResponse.json({ messages: formattedMessages })
  } catch (error) {
    console.error('Team Chat GET Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Enviar mensagem no chat da equipe
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Conteúdo obrigatório' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Buscar company
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })
    }

    const { data: message, error } = await serviceClient
      .from('team_messages')
      .insert({
        company_id: member.company_id,
        agent_id: session.user.id,
        content: content.trim(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Team Chat POST Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
