import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getMediaUrl, markMessageAsRead } from '@/lib/meta'
import { processAiResponse } from '@/lib/ai-agent'
import { processChatbotMessage } from '@/lib/chatbot-engine'
import { WebhookMessage, WebhookStatus } from '@/types'

// GET - Validação do webhook pela Meta
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST - Receber mensagens e status updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createServiceRoleClient()

    // Processar cada entry do webhook
    const entries = body.entry || []
    
    for (const entry of entries) {
      const changes = entry.changes || []
      
      for (const change of changes) {
        if (change.field !== 'messages') continue
        
        const value = change.value
        
        // Processar mensagens recebidas
        if (value.messages) {
          for (const message of value.messages) {
            await processInboundMessage(supabase, message, value.contacts?.[0], value.metadata?.phone_number_id)
          }
        }
        
        // Processar atualizações de status
        if (value.statuses) {
          for (const status of value.statuses) {
            await processStatusUpdate(supabase, status)
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ status: 'ok' }) // Sempre retorna 200 para a Meta
  }
}

async function processInboundMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  message: WebhookMessage,
  contactInfo?: { profile?: { name?: string }; wa_id?: string },
  phoneNumberId?: string
) {
  const phone = message.from
  const contactName = contactInfo?.profile?.name || phone

  // 0. Identificar a empresa pelo phone_number_id
  let companyId: string | null = null
  if (phoneNumberId) {
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('whatsapp_phone_number_id', phoneNumberId)
      .single()
    companyId = company?.id || null
  }

  // 1. Buscar ou criar contato
  let { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone', phone)
    .single()

  if (!contact) {
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({ phone, name: contactName, company_id: companyId })
      .select()
      .single()
    contact = newContact
  } else if (!contact.company_id && companyId) {
    // Atualizar company_id se não tinha
    await supabase.from('contacts').update({ company_id: companyId }).eq('id', contact.id)
    contact.company_id = companyId
  }

  if (!contact) return

  // 2. Buscar ou criar conversa aberta
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('contact_id', contact.id)
    .in('status', ['pending', 'open'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!conversation) {
    const { data: newConversation } = await supabase
      .from('conversations')
      .insert({
        contact_id: contact.id,
        status: 'pending',
        channel: 'whatsapp',
      })
      .select()
      .single()
    conversation = newConversation
  }

  if (!conversation) return

  // 3. Extrair conteúdo da mensagem
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
      if (message.image?.id) {
        try {
          mediaUrl = await getMediaUrl(message.image.id)
        } catch (e) {
          console.error('Error getting media URL:', e)
        }
      }
      break
    case 'audio':
      mediaMimeType = message.audio?.mime_type || null
      if (message.audio?.id) {
        try {
          mediaUrl = await getMediaUrl(message.audio.id)
        } catch (e) {
          console.error('Error getting media URL:', e)
        }
      }
      break
    case 'video':
      content = message.video?.caption || null
      mediaMimeType = message.video?.mime_type || null
      if (message.video?.id) {
        try {
          mediaUrl = await getMediaUrl(message.video.id)
        } catch (e) {
          console.error('Error getting media URL:', e)
        }
      }
      break
    case 'document':
      mediaMimeType = message.document?.mime_type || null
      mediaFilename = message.document?.filename || null
      if (message.document?.id) {
        try {
          mediaUrl = await getMediaUrl(message.document.id)
        } catch (e) {
          console.error('Error getting media URL:', e)
        }
      }
      break
    case 'sticker':
      mediaMimeType = message.sticker?.mime_type || null
      if (message.sticker?.id) {
        try {
          mediaUrl = await getMediaUrl(message.sticker.id)
        } catch (e) {
          console.error('Error getting media URL:', e)
        }
      }
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

  // 4. Salvar mensagem no banco
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    company_id: companyId || contact.company_id,
    whatsapp_message_id: message.id,
    direction: 'inbound',
    type: message.type,
    content,
    media_url: mediaUrl,
    media_mime_type: mediaMimeType,
    media_filename: mediaFilename,
    status: 'delivered',
  })

  // 5. Atualizar conversa
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

  // 6. Marcar como lida na Meta
  await markMessageAsRead(message.id)

  // 7. Processar com Chatbot e/ou Agente IA (async - não bloqueia o webhook)
  if (content && message.type === 'text') {
    const aiCompanyId = companyId || contact.company_id
    if (aiCompanyId) {
      // Buscar credenciais
      const { data: company } = await supabase
        .from('companies')
        .select('whatsapp_token, whatsapp_phone_number_id')
        .eq('id', aiCompanyId)
        .single()

      if (company?.whatsapp_token && company?.whatsapp_phone_number_id) {
          // Await para garantir que executa antes da function morrer
          await processChatbotAndAI(
            aiCompanyId,
            conversation.id,
            phone,
            content,
            company.whatsapp_phone_number_id,
            company.whatsapp_token
          )
        }
    }
  }
}

// Função separada para processar IA/chatbot sem bloquear
async function processChatbotAndAI(
  companyId: string,
  conversationId: string,
  phone: string,
  content: string,
  phoneNumberId: string,
  whatsappToken: string
) {
  const supabase = createServiceRoleClient()

  try {
    // Verificar se tem chatbot ativo antes de chamar o engine
    const { data: activeFlows } = await supabase
      .from('chatbot_flows')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .limit(1)

    let chatbotHandled = false

    if (activeFlows && activeFlows.length > 0) {
      try {
        const chatbotResult = await processChatbotMessage(
          companyId, conversationId, phone, content, phoneNumberId, whatsappToken
        )
        chatbotHandled = chatbotResult.handled
      } catch (e) {
        console.error('Chatbot engine error:', e)
      }
    }

    // Se chatbot não tratou, tentar Agente IA
    if (!chatbotHandled) {
      await processAiResponse(
        companyId, conversationId, phone, content, phoneNumberId, whatsappToken
      )
    }
  } catch (e) {
    console.error('processChatbotAndAI error:', e)
  }
}

async function processStatusUpdate(
  supabase: ReturnType<typeof createServiceRoleClient>,
  status: WebhookStatus
) {
  const { id, status: messageStatus } = status

  // Mapear status da Meta para nosso status
  const statusMap: Record<string, string> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
  }

  const mappedStatus = statusMap[messageStatus]
  if (!mappedStatus) return

  // Atualizar na tabela de mensagens
  await supabase
    .from('messages')
    .update({ status: mappedStatus })
    .eq('whatsapp_message_id', id)

  // Atualizar nas mensagens de campanha (se existir)
  if (mappedStatus === 'delivered' || mappedStatus === 'read' || mappedStatus === 'failed') {
    const { data: campaignMsg } = await supabase
      .from('campaign_messages')
      .select('id, campaign_id, status')
      .eq('whatsapp_message_id', id)
      .single()

    if (campaignMsg) {
      await supabase
        .from('campaign_messages')
        .update({ status: mappedStatus })
        .eq('id', campaignMsg.id)

      // Atualizar contadores da campanha
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('delivered_count, read_count')
        .eq('id', campaignMsg.campaign_id)
        .single()

      if (campaignData) {
        if (mappedStatus === 'delivered') {
          await supabase.from('campaigns')
            .update({ delivered_count: (campaignData.delivered_count || 0) + 1 })
            .eq('id', campaignMsg.campaign_id)
        } else if (mappedStatus === 'read') {
          await supabase.from('campaigns')
            .update({ read_count: (campaignData.read_count || 0) + 1 })
            .eq('id', campaignMsg.campaign_id)
        }
      }
    }
  }
}
