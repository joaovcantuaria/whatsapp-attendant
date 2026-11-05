import { createServiceRoleClient } from '@/lib/supabase-server'
import { WHATSAPP_SERVER_URL, WHATSAPP_SERVER_API_KEY as API_KEY } from '@/lib/whatsapp-server'

export async function processChatbotMessage(
  companyId: string,
  conversationId: string,
  contactPhone: string,
  userMessage: string,
  phoneNumberId: string,
  whatsappToken: string
): Promise<{ handled: boolean }> {
  const supabase = createServiceRoleClient()

  // 1. Verificar se existe sessão ativa para este contato
  const { data: activeSession } = await supabase
    .from('chatbot_sessions')
    .select('*, chatbot_flows(*)')
    .eq('contact_phone', contactPhone)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (activeSession) {
    // Continuar fluxo existente
    return await continueFlow(supabase, activeSession, userMessage, phoneNumberId, whatsappToken, conversationId)
  }

  // 2. Verificar se algum fluxo deve ser ativado
  const { data: flows } = await supabase
    .from('chatbot_flows')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  if (!flows || flows.length === 0) return { handled: false }

  // Verificar triggers
  const messageLower = userMessage.toLowerCase().trim()

  for (const flow of flows) {
    let shouldTrigger = false

    if (flow.trigger_type === 'first_message') {
      // Verificar se é primeira mensagem (sem histórico de chatbot)
      const { count } = await supabase
        .from('chatbot_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('contact_phone', contactPhone)
        .eq('company_id', companyId)

      if (!count || count === 0) shouldTrigger = true
      // Também ativar se mensagem contém keywords
      if (flow.trigger_keywords?.some((kw: string) => messageLower.includes(kw.toLowerCase()))) {
        shouldTrigger = true
      }
    } else if (flow.trigger_type === 'keyword') {
      if (flow.trigger_keywords?.some((kw: string) => messageLower.includes(kw.toLowerCase()))) {
        shouldTrigger = true
      }
    }

    if (shouldTrigger) {
      return await startFlow(supabase, flow, companyId, conversationId, contactPhone, phoneNumberId, whatsappToken)
    }
  }

  return { handled: false }
}

async function startFlow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  flow: any,
  companyId: string,
  conversationId: string,
  contactPhone: string,
  phoneNumberId: string,
  whatsappToken: string
): Promise<{ handled: boolean }> {
  // Buscar nó inicial
  const { data: startNode } = await supabase
    .from('chatbot_nodes')
    .select('*')
    .eq('flow_id', flow.id)
    .eq('is_start', true)
    .single()

  if (!startNode) return { handled: false }

  // Criar sessão
  await supabase.from('chatbot_sessions').insert({
    company_id: companyId,
    conversation_id: conversationId,
    contact_phone: contactPhone,
    flow_id: flow.id,
    current_node_id: startNode.id,
    status: 'active',
  })

  // Enviar mensagem do nó inicial
  if (startNode.message) {
    await sendWhatsAppText(phoneNumberId, whatsappToken, contactPhone, startNode.message)
    await saveOutboundMessage(supabase, conversationId, companyId, startNode.message)
  }

  // Se é um nó de ação (sem esperar resposta)
  if (startNode.node_type === 'action') {
    await executeAction(supabase, startNode, companyId, conversationId, contactPhone)
  }

  return { handled: true }
}

async function continueFlow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  session: any,
  userMessage: string,
  phoneNumberId: string,
  whatsappToken: string,
  conversationId: string
): Promise<{ handled: boolean }> {
  // Buscar nó atual
  const { data: currentNode } = await supabase
    .from('chatbot_nodes')
    .select('*')
    .eq('id', session.current_node_id)
    .single()

  if (!currentNode) {
    await supabase.from('chatbot_sessions').update({ status: 'completed' }).eq('id', session.id)
    return { handled: false }
  }

  // Determinar próximo nó baseado na resposta
  let nextNodeId: string | null = null

  if (currentNode.node_type === 'options' && currentNode.options) {
    const messageLower = userMessage.toLowerCase().trim()
    const option = currentNode.options.find((opt: any) =>
      messageLower === opt.value ||
      messageLower === opt.label?.toLowerCase() ||
      messageLower.includes(opt.label?.toLowerCase())
    )

    if (option?.next_node_id) {
      nextNodeId = option.next_node_id
    } else {
      // Resposta inválida - repetir opções
      await sendWhatsAppText(phoneNumberId, whatsappToken, session.contact_phone, '❌ Opção inválida. Por favor, escolha uma das opções acima.')
      return { handled: true }
    }
  }

  if (!nextNodeId) {
    // Fluxo terminou
    await supabase.from('chatbot_sessions').update({ status: 'completed' }).eq('id', session.id)
    return { handled: false }
  }

  // Buscar próximo nó
  const { data: nextNode } = await supabase
    .from('chatbot_nodes')
    .select('*')
    .eq('id', nextNodeId)
    .single()

  if (!nextNode) {
    await supabase.from('chatbot_sessions').update({ status: 'completed' }).eq('id', session.id)
    return { handled: false }
  }

  // Atualizar sessão
  await supabase.from('chatbot_sessions')
    .update({ current_node_id: nextNode.id, last_interaction_at: new Date().toISOString() })
    .eq('id', session.id)

  // Enviar mensagem
  if (nextNode.message) {
    // Delay se configurado
    if (nextNode.delay_seconds > 0) {
      await new Promise(resolve => setTimeout(resolve, nextNode.delay_seconds * 1000))
    }
    await sendWhatsAppText(phoneNumberId, whatsappToken, session.contact_phone, nextNode.message)
    await saveOutboundMessage(supabase, conversationId, session.company_id, nextNode.message)
  }

  // Executar ação se for nó de ação
  if (nextNode.node_type === 'action') {
    await executeAction(supabase, nextNode, session.company_id, conversationId, session.contact_phone)
    await supabase.from('chatbot_sessions').update({ status: 'completed' }).eq('id', session.id)
  }

  // Se não tem opções (é mensagem final), encerrar sessão
  if (nextNode.node_type === 'message' && !nextNode.options) {
    await supabase.from('chatbot_sessions').update({ status: 'completed' }).eq('id', session.id)
  }

  return { handled: true }
}

async function executeAction(
  supabase: ReturnType<typeof createServiceRoleClient>,
  node: any,
  companyId: string,
  conversationId: string,
  contactPhone: string
) {
  switch (node.action_type) {
    case 'transfer_agent':
      // Marcar conversa como pendente (para atendente pegar)
      await supabase
        .from('conversations')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', conversationId)
      break

    case 'add_tag':
      if (node.action_data?.tag) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('id, tags')
          .eq('phone', contactPhone)
          .single()
        if (contact) {
          const tags = [...(contact.tags || []), node.action_data.tag]
          await supabase.from('contacts').update({ tags }).eq('id', contact.id)
        }
      }
      break

    case 'close':
      await supabase
        .from('conversations')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', conversationId)
      break

    case 'collect_data':
      // Salvar no action_data que estamos coletando - o próximo input será salvo no campo indicado
      // Isso é tratado no continueFlow quando detecta o estado de coleta
      break

    case 'webhook':
      if (node.action_data?.webhook_url) {
        try {
          const { data: contact } = await supabase
            .from('contacts')
            .select('*')
            .eq('phone', contactPhone)
            .single()

          await fetch(node.action_data.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'chatbot.action',
              company_id: companyId,
              conversation_id: conversationId,
              contact: contact || { phone: contactPhone },
              timestamp: new Date().toISOString(),
            }),
          })
        } catch (e) {
          console.error('Webhook action error:', e)
        }
      }
      break

    case 'send_media':
      // Enviar mídia via API ou Baileys
      if (node.action_data?.media_url) {
        try {
          const { data: company } = await supabase
            .from('companies')
            .select('whatsapp_token, whatsapp_phone_number_id')
            .eq('id', companyId)
            .single()

          if (company?.whatsapp_token && company?.whatsapp_phone_number_id) {
            // Via Meta API
            const mediaType = node.action_data.media_type || 'image'
            const body: any = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: contactPhone,
              type: mediaType,
            }
            body[mediaType] = { link: node.action_data.media_url }
            await fetch(`https://graph.facebook.com/v22.0/${company.whatsapp_phone_number_id}/messages`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${company.whatsapp_token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
          } else {
            // Via Baileys
            await fetch(`${WHATSAPP_SERVER_URL}/api/message/send-media`, {
              method: 'POST',
              headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                instanceId: companyId,
                phone: contactPhone,
                mediaUrl: node.action_data.media_url,
                type: node.action_data.media_type || 'image',
              }),
            })
          }
        } catch (e) {
          console.error('Send media action error:', e)
        }
      }
      break
  }
}

async function sendWhatsAppText(phoneNumberId: string, token: string, to: string, text: string) {
  try {
    if (token && phoneNumberId) {
      // Via Meta Cloud API
      await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', recipient_type: 'individual', to,
          type: 'text', text: { body: text },
        }),
      })
    } else {
      // Via Baileys (QR Code)
      await fetch(`${WHATSAPP_SERVER_URL}/api/message/send-text`, {
        method: 'POST',
        headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: phoneNumberId || 'default', // phoneNumberId é usado como instanceId no Baileys
          phone: to,
          message: text,
          skipSave: true,
        }),
      })
    }
  } catch (e) {
    console.error('Chatbot send error:', e)
  }
}

async function saveOutboundMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  conversationId: string,
  companyId: string,
  content: string
) {
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    company_id: companyId,
    direction: 'outbound',
    type: 'text',
    content,
    status: 'sent',
  })

  await supabase.from('conversations').update({
    last_message: content,
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', conversationId)
}
