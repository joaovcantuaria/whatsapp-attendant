import { createServiceRoleClient } from '@/lib/supabase-server'

interface AiConfig {
  is_active: boolean
  api_key: string
  model: string
  system_prompt: string
  greeting_message: string
  transfer_keywords: string[]
  max_messages_before_transfer: number
  active_hours_start: string
  active_hours_end: string
  active_days: number[]
  temperature: number
  max_tokens: number
  context_messages: number
}

export async function processAiResponse(
  companyId: string,
  conversationId: string,
  contactPhone: string,
  userMessage: string,
  phoneNumberId: string,
  whatsappToken: string
): Promise<{ responded: boolean; transferred: boolean }> {
  const supabase = createServiceRoleClient()

  // 1. Buscar config do agente
  const { data: config } = await supabase
    .from('ai_agent_config')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (!config || !config.is_active || !config.api_key) {
    return { responded: false, transferred: false }
  }

  // 2. Verificar se está no horário ativo
  if (!isWithinActiveHours(config)) {
    return { responded: false, transferred: false }
  }

  // 3. Verificar se a conversa já tem agente humano atribuído
  const { data: conversation } = await supabase
    .from('conversations')
    .select('agent_id, status')
    .eq('id', conversationId)
    .single()

  if (conversation?.agent_id) {
    return { responded: false, transferred: false }
  }

  // 4. Verificar keywords de transferência
  const shouldTransfer = config.transfer_keywords?.some(
    (kw: string) => userMessage.toLowerCase().includes(kw.toLowerCase())
  )

  if (shouldTransfer) {
    // Log e marcar como transferido
    await logAiMessage(supabase, companyId, conversationId, contactPhone, userMessage, 'Transferindo para atendente humano...', 0, 0, true)
    // Enviar mensagem de transferência
    await sendWhatsAppMessage(phoneNumberId, whatsappToken, contactPhone, 'Entendi! Vou transferir você para um atendente humano. Aguarde um momento.')
    return { responded: true, transferred: true }
  }

  // 5. Verificar limite de mensagens
  const { count: messageCount } = await supabase
    .from('ai_agent_logs')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('transferred', false)

  if ((messageCount || 0) >= config.max_messages_before_transfer) {
    await sendWhatsAppMessage(phoneNumberId, whatsappToken, contactPhone, 'Vou transferir você para um atendente especializado para melhor atendê-lo. Aguarde um momento!')
    await logAiMessage(supabase, companyId, conversationId, contactPhone, userMessage, '[limite atingido - transferindo]', 0, 0, true)
    return { responded: true, transferred: true }
  }

  // 6. Buscar contexto (mensagens anteriores)
  const { data: previousMessages } = await supabase
    .from('messages')
    .select('direction, content, type')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(config.context_messages || 5)

  const contextMessages = (previousMessages || []).reverse().map((msg) => ({
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.content || `[${msg.type}]`,
  }))

  // 7. Chamar OpenAI
  const startTime = Date.now()
  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: config.system_prompt },
          ...contextMessages,
          { role: 'user', content: userMessage },
        ],
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 500,
      }),
    })

    if (!openaiResponse.ok) {
      console.error('OpenAI error:', await openaiResponse.text())
      return { responded: false, transferred: false }
    }

    const aiData = await openaiResponse.json()
    const aiMessage = aiData.choices?.[0]?.message?.content || ''
    const tokensUsed = aiData.usage?.total_tokens || 0
    const responseTime = Date.now() - startTime

    if (!aiMessage) return { responded: false, transferred: false }

    // 8. Enviar resposta via WhatsApp
    const sent = await sendWhatsAppMessage(phoneNumberId, whatsappToken, contactPhone, aiMessage)

    if (sent) {
      // Salvar mensagem no banco
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        company_id: companyId,
        direction: 'outbound',
        type: 'text',
        content: aiMessage,
        status: 'sent',
        whatsapp_message_id: sent.messageId,
      })

      // Atualizar conversa
      await supabase
        .from('conversations')
        .update({
          last_message: aiMessage,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      // Log
      await logAiMessage(supabase, companyId, conversationId, contactPhone, userMessage, aiMessage, tokensUsed, responseTime, false)
    }

    return { responded: true, transferred: false }
  } catch (error) {
    console.error('AI Agent error:', error)
    return { responded: false, transferred: false }
  }
}

function isWithinActiveHours(config: AiConfig): boolean {
  const now = new Date()
  const day = now.getDay() // 0=dom, 1=seg...6=sab

  if (!config.active_days?.includes(day)) return false

  const currentTime = now.toTimeString().slice(0, 5) // HH:MM
  const start = config.active_hours_start || '08:00'
  const end = config.active_hours_end || '22:00'

  return currentTime >= start && currentTime <= end
}

async function sendWhatsAppMessage(phoneNumberId: string, token: string, to: string, text: string) {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return { messageId: data.messages?.[0]?.id }
    }
    return null
  } catch {
    return null
  }
}

async function logAiMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  companyId: string,
  conversationId: string,
  contactPhone: string,
  userMessage: string,
  aiResponse: string,
  tokensUsed: number,
  responseTimeMs: number,
  transferred: boolean
) {
  await supabase.from('ai_agent_logs').insert({
    company_id: companyId,
    conversation_id: conversationId,
    contact_phone: contactPhone,
    user_message: userMessage,
    ai_response: aiResponse,
    tokens_used: tokensUsed,
    response_time_ms: responseTimeMs,
    transferred,
  })
}
