import type { createServiceRoleClient } from '@/lib/supabase-server'

/**
 * Lembretes de tarefas do Bora Gerir App (enviados pelo WhatsApp do Bora Gerir):
 * quando a pessoa toca em "Concluí" ou "Adiar 1 dia", repassa o payload ao App
 * (que confere a assinatura e o telefone) e responde no WhatsApp com o resultado.
 */

type Supabase = ReturnType<typeof createServiceRoleClient>

const APP_URL = (process.env.BORAGERIR_APP_URL || 'https://app.boragerir.com').replace(/\/$/, '')

export async function responderAcaoDeTarefa(
  supabase: Supabase,
  params: { companyId: string | null; conversationId: string; phone: string; payload: string }
): Promise<void> {
  let texto = 'Não consegui atualizar a tarefa agora. Tente pelo app em app.boragerir.com.'
  try {
    const res = await fetch(`${APP_URL}/api/whatsapp/acao-tarefa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: params.payload, phone: params.phone }),
      signal: AbortSignal.timeout(15000),
    })
    const dados = await res.json().catch(() => null)
    if (res.ok && typeof dados?.mensagem === 'string') texto = dados.mensagem
  } catch {
    // mantém a mensagem padrão
  }

  if (!params.companyId) return
  const { data: company } = await supabase
    .from('companies').select('whatsapp_token, whatsapp_phone_number_id').eq('id', params.companyId).single()
  if (!company?.whatsapp_token || !company?.whatsapp_phone_number_id) return

  // A pessoa acabou de responder: a janela de 24h está aberta para texto livre
  const res = await fetch(`https://graph.facebook.com/v22.0/${company.whatsapp_phone_number_id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${company.whatsapp_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: params.phone, type: 'text', text: { body: texto } }),
  }).catch(() => null)
  const dados = res?.ok ? await res.json().catch(() => null) : null
  await supabase.from('messages').insert({
    conversation_id: params.conversationId,
    company_id: params.companyId,
    whatsapp_message_id: dados?.messages?.[0]?.id || null,
    direction: 'outbound',
    type: 'text',
    content: texto,
    status: res?.ok ? 'sent' : 'failed',
  })
}
