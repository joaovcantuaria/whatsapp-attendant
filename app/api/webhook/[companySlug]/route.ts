import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { checkConversationLimit, incrementUsage, isCompanyActive } from '@/lib/plan-limits'
import { processAiResponse } from '@/lib/ai-agent'
import { processChatbotMessage } from '@/lib/chatbot-engine'
import { WebhookMessage, WebhookStatus } from '@/types'

// GET - Validação do webhook pela Meta (por empresa)
export async function GET(
  request: NextRequest,
  { params }: { params: { companySlug: string } }
) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe') {
    // Buscar token da empresa no banco
    const supabase = createServiceRoleClient()
    const { data: company } = await supabase
      .from('companies')
      .select('webhook_verify_token')
      .eq('slug', params.companySlug)
      .single()

    if (company && token === company.webhook_verify_token) {
      return new NextResponse(challenge, { status: 200 })
    }

    // Fallback: formato antigo (slug_SECRET)
    const legacyToken = `${params.companySlug}_${process.env.WEBHOOK_SECRET}`
    if (token === legacyToken) {
      return new NextResponse(challenge, { status: 200 })
    }
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST - Receber mensagens (por empresa)
export async function POST(
  request: NextRequest,
  { params }: { params: { companySlug: string } }
) {
  try {
    const supabase = createServiceRoleClient()

    // Buscar empresa pelo slug
    const { data: company } = await supabase
      .from('companies')
      .select('id, plan_status, trial_ends_at, whatsapp_token, whatsapp_phone_number_id')
      .eq('slug', params.companySlug)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Verificar se plano está ativo
    if (!isCompanyActive(company.plan_status, company.trial_ends_at)) {
      return NextResponse.json({ status: 'suspended' }, { status: 403 })
    }

    const body = await request.json()
    const entries = body.entry || []

    for (const entry of entries) {
      const changes = entry.changes || []

      for (const change of changes) {
        if (change.field !== 'messages') continue
        const value = change.value

        if (value.messages) {
          for (const message of value.messages) {
            await processInboundMessage(supabase, message, value.contacts?.[0], company.id, company.whatsapp_token!, company.whatsapp_phone_number_id!)
          }
        }

        if (value.statuses) {
          for (const status of value.statuses) {
            await processStatusUpdate(supabase, status, company.id)
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}

async function processInboundMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  message: WebhookMessage,
  contactInfo: { profile?: { name?: string }; wa_id?: string } | undefined,
  companyId: string,
  whatsappToken: string,
  phoneNumberId: string
) {
  const phone = message.from
  const contactName = contactInfo?.profile?.name || phone

  // Buscar ou criar contato para esta empresa
  let { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone', phone)
    .eq('company_id', companyId)
    .single()

  if (!contact) {
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({ phone, name: contactName, company_id: companyId })
      .select()
      .single()
    contact = newContact
  }

  if (!contact) return

  // Buscar ou criar conversa
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('contact_id', contact.id)
    .eq('company_id', companyId)
    .in('status', ['pending', 'open'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!conversation) {
    // Verificar limite de conversas
    const canCreate = await checkConversationLimit(companyId)
    if (!canCreate) {
      console.warn(`Company ${companyId} reached conversation limit`)
      return
    }

    const { data: newConversation } = await supabase
      .from('conversations')
      .insert({
        contact_id: contact.id,
        company_id: companyId,
        status: 'pending',
        channel: 'whatsapp',
      })
      .select()
      .single()
    conversation = newConversation

    await incrementUsage(companyId, 'conversation')
  }

  if (!conversation) return

  // Extrair conteúdo
  let content: string | null = null
  let mediaUrl: string | null = null
  let mediaMimeType: string | null = null
  let mediaFilename: string | null = null

  switch (message.type) {
    case 'text':
      content = message.text?.body || null
      break
    case 'image':
      content = message.image?.caption || null
      mediaMimeType = message.image?.mime_type || null
      // Salvar o media_id da Meta (não a URL temporária que expira)
      mediaUrl = message.image?.id ? `meta_media:${message.image.id}` : null
      break
    case 'audio':
      mediaMimeType = message.audio?.mime_type || null
      mediaUrl = message.audio?.id ? `meta_media:${message.audio.id}` : null
      break
    case 'video':
      content = message.video?.caption || null
      mediaMimeType = message.video?.mime_type || null
      mediaUrl = message.video?.id ? `meta_media:${message.video.id}` : null
      break
    case 'document':
      mediaMimeType = message.document?.mime_type || null
      mediaFilename = message.document?.filename || null
      mediaUrl = message.document?.id ? `meta_media:${message.document.id}` : null
      break
    case 'sticker':
      mediaMimeType = message.sticker?.mime_type || null
      mediaUrl = message.sticker?.id ? `meta_media:${message.sticker.id}` : null
      break
    case 'location':
      content = JSON.stringify({
        latitude: message.location?.latitude,
        longitude: message.location?.longitude,
        name: message.location?.name,
        address: message.location?.address,
      })
      break
  }

  // Salvar mensagem
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    company_id: companyId,
    whatsapp_message_id: message.id,
    direction: 'inbound',
    type: message.type,
    content,
    media_url: mediaUrl,
    media_mime_type: mediaMimeType,
    media_filename: mediaFilename,
    status: 'delivered',
  })

  // Atualizar conversa
  const lastMessageText = content || `[${message.type}]`
  await supabase
    .from('conversations')
    .update({
      last_message: lastMessageText,
      last_message_at: new Date().toISOString(),
      unread_count: conversation.unread_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.id)

  // Incrementar uso
  await incrementUsage(companyId, 'message_received')

  // Marcar como lida na Meta
  await markMessageAsReadWithToken(message.id, whatsappToken, phoneNumberId)

  // Processar com Chatbot e/ou Agente IA
  if (content && message.type === 'text') {
    try {
      // Verificar se tem chatbot ativo
      const { data: activeFlows } = await supabase
        .from('chatbot_flows')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .limit(1)

      let chatbotHandled = false
      if (activeFlows && activeFlows.length > 0) {
        try {
          const result = await processChatbotMessage(companyId, conversation.id, phone, content, phoneNumberId, whatsappToken)
          chatbotHandled = result.handled
        } catch (e) {
          console.error('Chatbot error:', e)
        }
      }

      // Se chatbot não tratou, tentar Agente IA
      if (!chatbotHandled) {
        await processAiResponse(companyId, conversation.id, phone, content, phoneNumberId, whatsappToken)
      }
    } catch (e) {
      console.error('AI/Chatbot processing error:', e)
    }
  }
}

async function processStatusUpdate(
  supabase: ReturnType<typeof createServiceRoleClient>,
  status: WebhookStatus,
  companyId: string
) {
  const statusMap: Record<string, string> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
  }

  const mappedStatus = statusMap[status.status]
  if (!mappedStatus) return

  await supabase
    .from('messages')
    .update({ status: mappedStatus })
    .eq('whatsapp_message_id', status.id)
    .eq('company_id', companyId)
}

// Funções auxiliares com token específico da empresa
async function markMessageAsReadWithToken(messageId: string, whatsappToken: string, phoneNumberId?: string): Promise<void> {
  if (!phoneNumberId) return
  try {
    await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    })
  } catch {
    // Não é crítico - ignorar erro silenciosamente
  }
}
