import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { conversationId, targetAgentId } = body

    if (!conversationId || !targetAgentId) {
      return NextResponse.json({ error: 'conversationId e targetAgentId obrigatórios' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Get target agent name
    const { data: targetAgent } = await serviceClient
      .from('agents')
      .select('name')
      .eq('id', targetAgentId)
      .single()

    // Update conversation
    const { data: updated, error } = await serviceClient
      .from('conversations')
      .update({
        agent_id: targetAgentId,
        status: 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Log the transfer as an internal note
    await serviceClient.from('messages').insert({
      conversation_id: conversationId,
      company_id: updated.company_id,
      direction: 'internal',
      type: 'internal_note',
      content: `🔄 Conversa transferida para ${targetAgent?.name || 'outro atendente'}`,
      status: 'sent',
      agent_id: session.user.id,
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
