import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// POST - Upload de mídia e envio via WhatsApp
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const conversationId = formData.get('conversationId') as string
    const phone = formData.get('phone') as string
    const type = formData.get('type') as string // 'image' | 'document' | 'audio' | 'video'
    const caption = formData.get('caption') as string | null

    if (!file || !conversationId || !phone || !type) {
      return NextResponse.json({ error: 'file, conversationId, phone e type são obrigatórios' }, { status: 400 })
    }

    // Buscar credenciais da empresa
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

    const { data: company } = await serviceClient
      .from('companies')
      .select('whatsapp_token, whatsapp_phone_number_id')
      .eq('id', member.company_id)
      .single()

    if (!company?.whatsapp_token || !company?.whatsapp_phone_number_id) {
      return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 })
    }

    const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0'

    // 1. Upload da mídia para a Meta
    const uploadFormData = new FormData()
    uploadFormData.append('messaging_product', 'whatsapp')
    uploadFormData.append('file', file)
    uploadFormData.append('type', file.type)

    const uploadResponse = await fetch(
      `${WHATSAPP_API_URL}/${company.whatsapp_phone_number_id}/media`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${company.whatsapp_token}` },
        body: uploadFormData,
      }
    )

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.json()
      return NextResponse.json({
        error: `Erro no upload: ${uploadError.error?.message || 'Falha ao fazer upload'}`,
      }, { status: 500 })
    }

    const uploadData = await uploadResponse.json()
    const mediaId = uploadData.id

    if (!mediaId) {
      return NextResponse.json({ error: 'Upload falhou - sem media ID' }, { status: 500 })
    }

    // 2. Enviar mensagem com a mídia
    let messagePayload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type,
    }

    switch (type) {
      case 'image':
        messagePayload.image = { id: mediaId, caption: caption || undefined }
        break
      case 'video':
        messagePayload.video = { id: mediaId, caption: caption || undefined }
        break
      case 'document':
        messagePayload.document = { id: mediaId, filename: file.name }
        break
      case 'audio':
        messagePayload.audio = { id: mediaId }
        break
      default:
        return NextResponse.json({ error: 'Tipo não suportado' }, { status: 400 })
    }

    const sendResponse = await fetch(
      `${WHATSAPP_API_URL}/${company.whatsapp_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${company.whatsapp_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    )

    if (!sendResponse.ok) {
      const sendError = await sendResponse.json()
      return NextResponse.json({
        error: `Erro ao enviar: ${sendError.error?.message || 'Falha no envio'}`,
      }, { status: 500 })
    }

    const sendData = await sendResponse.json()
    const whatsappMessageId = sendData?.messages?.[0]?.id || null

    // 3. Salvar mensagem no banco
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        company_id: member.company_id,
        whatsapp_message_id: whatsappMessageId,
        direction: 'outbound',
        type,
        content: caption || null,
        media_url: `meta_media:${mediaId}`,
        media_mime_type: file.type,
        media_filename: file.name,
        status: 'sent',
        agent_id: session.user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Erro ao salvar mensagem' }, { status: 500 })
    }

    // 4. Atualizar conversa
    const lastMessageText = caption || `[${type}]`
    await supabase
      .from('conversations')
      .update({
        last_message: lastMessageText,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    return NextResponse.json(message)
  } catch (error) {
    console.error('Upload media error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
