import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

// GET - Buscar mensagens diretas com um agente específico
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const targetId = request.nextUrl.searchParams.get('targetId')
    if (!targetId) return NextResponse.json({ error: 'targetId obrigatório' }, { status: 400 })

    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

    // Buscar mensagens DM entre os dois agentes
    const { data: messages } = await serviceClient
      .from('team_messages')
      .select(`id, agent_id, content, created_at, target_agent_id, agents:agent_id(name, avatar_url)`)
      .eq('company_id', member.company_id)
      .or(`and(agent_id.eq.${session.user.id},target_agent_id.eq.${targetId}),and(agent_id.eq.${targetId},target_agent_id.eq.${session.user.id})`)
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
    console.error('DM GET Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Enviar mensagem direta para um agente
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { content, targetId } = body

    if (!content?.trim() || !targetId) {
      return NextResponse.json({ error: 'content e targetId obrigatórios' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

    const { data: message, error } = await serviceClient
      .from('team_messages')
      .insert({
        company_id: member.company_id,
        agent_id: session.user.id,
        target_agent_id: targetId,
        content: content.trim(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('DM POST Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
