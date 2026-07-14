import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { conversationId, recipientId, content } = await request.json()

    if (!conversationId || !recipientId || !content) {
      return NextResponse.json({ error: 'conversationId, recipientId e content obrigatórios' }, { status: 400 })
    }

    // Get company's Instagram access token
    const serviceClient = createServiceRoleClient()
    const { data: agent } = await serviceClient
      .from('agents')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (!agent?.company_id) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const { data: company } = await serviceClient
      .from('companies')
      .select('instagram_access_token, instagram_page_id')
      .eq('id', agent.company_id)
      .single()

    if (!company?.instagram_access_token) {
      return NextResponse.json({ error: 'Instagram não conectado' }, { status: 400 })
    }

    // Send message via Instagram Graph API
    const response = await fetch(
      `https://graph.instagram.com/v21.0/${company.instagram_page_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${company.instagram_access_token}`,
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: content },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json()
      console.error('[Instagram] Send error:', err)
      return NextResponse.json({ error: err.error?.message || 'Erro ao enviar' }, { status: 400 })
    }

    const result = await response.json()

    // Save message to database
    const { data: message } = await serviceClient.from('messages').insert({
      conversation_id: conversationId,
      content,
      sender_type: 'agent',
      message_type: 'text',
      external_id: result.message_id || '',
      agent_id: session.user.id,
      created_at: new Date().toISOString(),
    }).select().single()

    // Update conversation
    await serviceClient
      .from('conversations')
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      })
      .eq('id', conversationId)

    return NextResponse.json(message)
  } catch (error) {
    console.error('[Instagram] Send error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
