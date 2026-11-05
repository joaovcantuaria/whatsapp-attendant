import { createServiceRoleClient } from '@/lib/supabase-server'

/**
 * Descadastro de mensagens automáticas (LGPD / boas práticas da Meta).
 * "SAIR" → contato deixa de receber campanhas e automações; "VOLTAR" desfaz.
 * Mensagens de atendimento (conversa iniciada pelo cliente) continuam normais.
 */

type Supabase = ReturnType<typeof createServiceRoleClient>

// Só a palavra sozinha: "quero sair do grupo" ou "cancelar horário" não descadastram
const PALAVRAS_SAIR = /^\s*(sair|parar|stop|descadastrar|descadastro)\s*[.!]*\s*$/i
const PALAVRAS_VOLTAR = /^\s*(voltar|start)\s*[.!]*\s*$/i

export type IntencaoOptOut = 'sair' | 'voltar'

export function intencaoOptOut(texto: string | null | undefined): IntencaoOptOut | null {
  if (!texto) return null
  if (PALAVRAS_SAIR.test(texto)) return 'sair'
  if (PALAVRAS_VOLTAR.test(texto)) return 'voltar'
  return null
}

const RESPOSTAS: Record<IntencaoOptOut, string> = {
  sair: 'Pronto! Você não vai mais receber mensagens automáticas e promoções por aqui. Se mudar de ideia, é só responder VOLTAR.',
  voltar: 'Que bom ter você de volta! Você voltou a receber nossas novidades. Para parar, responda SAIR.',
}

/**
 * Atualiza o contato e, se houver credenciais da Meta, confirma ao cliente
 * (dentro da janela de 24h aberta pela própria mensagem dele).
 */
export async function aplicarOptOut(
  supabase: Supabase,
  params: {
    intencao: IntencaoOptOut
    contactId: string
    companyId: string | null
    conversationId: string
    phone: string
    whatsappToken?: string | null
    phoneNumberId?: string | null
  }
): Promise<void> {
  const { intencao, contactId, companyId, conversationId, phone, whatsappToken, phoneNumberId } = params

  await supabase
    .from('contacts')
    .update({
      opted_out: intencao === 'sair',
      opted_out_at: intencao === 'sair' ? new Date().toISOString() : null,
    })
    .eq('id', contactId)

  if (!whatsappToken || !phoneNumberId) return

  const texto = RESPOSTAS[intencao]
  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: texto } }),
    })
    if (!res.ok) return
    const dados = await res.json().catch(() => null)

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      company_id: companyId,
      whatsapp_message_id: dados?.messages?.[0]?.id || null,
      direction: 'outbound',
      type: 'text',
      content: texto,
      status: 'sent',
    })
  } catch {
    // A confirmação é cortesia; o descadastro já foi salvo
  }
}
