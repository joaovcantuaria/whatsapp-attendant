import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, content } = body

    if (!conversationId || !content?.trim()) {
      return NextResponse.json({ error: 'conversationId e content são obrigatórios' }, { status: 400 })
    }

    // Buscar company_id do membro
    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    // Inserir nota interna como mensagem com direction='internal' e type='internal_note'
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        company_id: member.company_id,
        direction: 'internal',
        type: 'internal_note',
        content: content.trim(),
        status: 'sent',
        agent_id: session.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving internal note:', error)
      return NextResponse.json({ error: 'Erro ao salvar nota interna' }, { status: 500 })
    }

    return NextResponse.json(message)
  } catch (error) {
    console.error('Internal note error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
