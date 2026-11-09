import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { checkConversationLimit, incrementUsage, isCompanyActive } from '@/lib/plan-limits'
import { processAiResponse } from '@/lib/ai-agent'
import { processChatbotMessage } from '@/lib/chatbot-engine'
import { WebhookMessage, WebhookStatus } from '@/types'
import { MENSAGEM_NAO_SUPORTADA } from '@/lib/mensagem-nao-suportada'
import { aplicarOptOut, intencaoOptOut } from '@/lib/opt-out'
import { responderAusenciaSeFechado } from '@/lib/ausencia'
import { aplicarLinkDeEntrada } from '@/lib/links-entrada'
import { responderAcaoDeTarefa } from '@/lib/acao-tarefa-app'

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

    // Plano vencido: as mensagens são guardadas (o cliente não perde nada), mas
    // sem chatbot/IA nem confirmação de leitura até a empresa reativar o plano.
    // Antes o webhook respondia 403 e a Meta descartava tudo.
    const planoAtivo = isCompanyActive(company.plan_status, company.trial_ends_at)

    const body = await request.json()
    const entries = body.entry || []

    for (const entry of entries) {
      const changes = entry.changes || []

      for (const change of changes) {
        if (change.field !== 'messages') continue
        const value = change.value

        if (value.messages) {
          for (const message of value.messages) {
            await processInboundMessage(supabase, message, value.contacts?.[0], company.id, company.whatsapp_token!, company.whatsapp_phone_number_id!, planoAtivo)
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
  phoneNumberId: string,
  planoAtivo: boolean
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
    // Verificar se tem conversa fechada para reabrir
    const { data: closedConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('company_id', companyId)
      .eq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (closedConv) {
      // Reabrir a conversa fechada
      const { data: reopened } = await supabase
        .from('conversations')
        .update({
          status: 'pending',
          agent_id: null,
          unread_count: 1,
        })
        .eq('id', closedConv.id)
        .select()
        .single()
      conversation = reopened || closedConv
    } else {
      // Criar nova conversa (com plano vencido, guarda mesmo assim)
      const canCreate = !planoAtivo || await checkConversationLimit(companyId)
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
    case 'button':
      // Resposta de botão quick_reply de um template
      content = message.button?.text || message.button?.payload || null
      break
    case 'interactive':
      // Resposta de lista ou botão interativo
      if (message.interactive?.button_reply) {
        content = message.interactive.button_reply.title
      } else if (message.interactive?.list_reply) {
        content = message.interactive.list_reply.title
      } else if ((message.interactive as any)?.nfm_reply) {
        // WhatsApp Flow response
        try {
          const nfmReply = (message.interactive as any).nfm_reply
          const flowResponse = JSON.parse(nfmReply.response_json || '{}')
          const fields = Object.entries(flowResponse)
            .filter(([key]) => key !== 'flow_token')
            .map(([key, value]) => `${value}`)
            .join(' | ')
          content = fields || 'Resposta do formulário'
          
          // Marcar como flow response para processamento posterior
          ;(message as any)._flowResponse = flowResponse
        } catch {
          content = (message.interactive as any).nfm_reply?.body || 'Resposta do formulário'
        }
      }
      break
    case 'reaction':
      // Reação a uma mensagem - salvar mas não atualizar last_message
      content = message.reaction?.emoji || null
      break
    case 'unsupported':
      // A Meta só avisa que chegou algo que a API oficial não repassa
      // (enquete, visualização única, mensagem editada/apagada, evento...)
      content = MENSAGEM_NAO_SUPORTADA
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

  // Detectar resposta de pesquisa de satisfação (Flow)
  if (message.type === 'interactive' && (message as any)._flowResponse) {
    try {
      const flowResponse = (message as any)._flowResponse
      // Tentar extrair nota/rating do flow
      // Procurar campos que parecem ser notas (1-5, estrelas, etc.)
      let rating: number | null = null
      let feedback: string | null = null
      
      for (const [key, value] of Object.entries(flowResponse)) {
        if (key === 'flow_token') continue
        const strValue = String(value)
        
        // Detectar rating - campo com número 1-5, ou com palavras como "ótimo", "bom", etc.
        const numMatch = strValue.match(/^[1-5]$/)
        if (numMatch) {
          rating = parseInt(numMatch[0])
        } else if (/ótimo|excelente|muito.?bom|5/i.test(strValue)) {
          rating = 5
        } else if (/bom|4/i.test(strValue) && !/muito.?bom/i.test(strValue)) {
          rating = 4
        } else if (/regular|razoável|3/i.test(strValue)) {
          rating = 3
        } else if (/ruim|2/i.test(strValue)) {
          rating = 2
        } else if (/péssimo|horrível|1/i.test(strValue)) {
          rating = 1
        } else if (/sim/i.test(strValue) && !rating) {
          rating = 5 // "Sim" em pesquisa geralmente = satisfeito
        } else if (/não|nao/i.test(strValue) && !rating) {
          rating = 2
        }
        
        // Campos de texto livre = feedback
        if (strValue.length > 3 && !numMatch && !/^(sim|não|nao)$/i.test(strValue)) {
          feedback = strValue
        }
      }

      if (rating) {
        await supabase.from('satisfaction_ratings').insert({
          company_id: companyId,
          contact_id: contact?.id || null,
          conversation_id: conversation.id,
          contact_name: contactInfo?.profile?.name || phone,
          contact_phone: phone,
          rating,
          feedback,
          rated_at: new Date().toISOString(),
        })
        console.log(`[Webhook] ⭐ Avaliação registrada via Flow: ${phone} → nota ${rating}`)
      }
    } catch (err) {
      console.error('[Webhook] Erro ao registrar avaliação:', err)
    }
  }

  // Botão "Concluí" / "Adiar" de lembrete de tarefa do Bora Gerir App: resolve e responde
  if (message.type === 'button' && message.button?.payload?.startsWith('tarefa:')) {
    await responderAcaoDeTarefa(supabase, { companyId: companyId, conversationId: conversation.id, phone, payload: message.button.payload })
    return
  }

  // Link de entrada (#CODIGO): origem, etiqueta e departamento
  if (message.type === 'text') {
    await aplicarLinkDeEntrada(supabase, { companyId, contactId: contact.id, conversationId: conversation.id, texto: content })
  }

  // "SAIR" / "VOLTAR": atualiza o descadastro e não passa para chatbot/IA
  const optOut = message.type === 'text' ? intencaoOptOut(content) : null
  if (optOut) {
    await aplicarOptOut(supabase, {
      intencao: optOut,
      contactId: contact.id,
      companyId,
      conversationId: conversation.id,
      phone,
      whatsappToken: planoAtivo ? whatsappToken : null,
      phoneNumberId: planoAtivo ? phoneNumberId : null,
    })
    return
  }

  if (!planoAtivo) return

  // Fora do horário de atendimento: avisa o cliente (no máximo 1x a cada 12h por conversa)
  await responderAusenciaSeFechado(supabase, { companyId, conversationId: conversation.id, phone, whatsappToken, phoneNumberId })

  // Marcar como lida na Meta
  await markMessageAsReadWithToken(message.id, whatsappToken, phoneNumberId)

  // Processar com Chatbot e/ou Agente IA
  if (content && ['text', 'button', 'interactive'].includes(message.type)) {
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
