import { createServiceRoleClient } from '@/lib/supabase-server'
import { enviarTemplate } from '@/lib/campanhas'

/**
 * Automações do funil: rodam quando um negócio ENTRA numa etapa.
 *  - criar_tarefa    { titulo, prazo_dias }
 *  - enviar_template { template_name, template_language }  (funciona fora da janela de 24h)
 *  - enviar_texto    { texto }  (só se o cliente falou nas últimas 24h — regra da Meta)
 * Cada execução vira uma anotação "⚡ Automação" no histórico do contato.
 */

type Supabase = ReturnType<typeof createServiceRoleClient>

const DIA_MS = 24 * 60 * 60 * 1000

interface Negocio {
  id: string
  company_id: string
  contact_id: string | null
  agent_id: string | null
  title: string
}

type Contato = { id: string; name: string | null; phone: string; custom_fields: Record<string, unknown> | null; opted_out: boolean | null }

export async function executarAutomacoesDaEtapa(supabase: Supabase, negocio: Negocio, stageId: string, usuarioId: string) {
  const { data: automacoes } = await supabase
    .from('crm_stage_automations')
    .select('id, action, config')
    .eq('company_id', negocio.company_id)
    .eq('stage_id', stageId)
    .eq('is_active', true)
  if (!automacoes || automacoes.length === 0) return

  const { data: contato } = negocio.contact_id
    ? await supabase.from('contacts').select('id, name, phone, custom_fields, opted_out').eq('id', negocio.contact_id).single()
    : { data: null }

  for (const a of automacoes) {
    const config = (a.config || {}) as Record<string, unknown>
    let resultado: string
    try {
      if (a.action === 'criar_tarefa') {
        resultado = await criarTarefa(supabase, negocio, usuarioId, config)
      } else if (!contato?.phone) {
        resultado = 'mensagem não enviada: negócio sem contato com telefone'
      } else if (contato.opted_out) {
        resultado = 'mensagem não enviada: o contato pediu para não receber mensagens (SAIR)'
      } else if (a.action === 'enviar_template') {
        resultado = await enviarTemplateDaAutomacao(supabase, negocio.company_id, contato as Contato, config)
      } else {
        resultado = await enviarTextoDaAutomacao(supabase, negocio.company_id, contato as Contato, String(config.texto || ''))
      }
    } catch (e) {
      resultado = `falhou: ${e instanceof Error ? e.message : 'erro desconhecido'}`
    }

    // crm_activities.type tem lista fixa de valores: registra como anotação
    await supabase.from('crm_activities').insert({
      company_id: negocio.company_id,
      contact_id: negocio.contact_id,
      deal_id: negocio.id,
      agent_id: usuarioId,
      type: 'note',
      content: `⚡ Automação ("${negocio.title}"): ${resultado}`,
    })
  }
}

async function criarTarefa(supabase: Supabase, negocio: Negocio, usuarioId: string, config: Record<string, unknown>) {
  const titulo = String(config.titulo || 'Acompanhar negociação').slice(0, 200)
  const dias = Math.max(0, Math.min(365, Math.round(Number(config.prazo_dias) || 0)))
  const prazo = new Date(Date.now() + dias * DIA_MS).toISOString().slice(0, 10)
  const { error } = await supabase.from('crm_tasks').insert({
    company_id: negocio.company_id,
    agent_id: negocio.agent_id || usuarioId,
    contact_id: negocio.contact_id,
    deal_id: negocio.id,
    title: titulo,
    due_date: prazo,
  })
  if (error) return `tarefa não criada (${error.message})`
  return `tarefa "${titulo}" criada para ${prazo.split('-').reverse().join('/')}`
}

async function credenciais(supabase: Supabase, companyId: string) {
  const { data } = await supabase.from('companies').select('whatsapp_token, whatsapp_phone_number_id').eq('id', companyId).single()
  return data
}

async function enviarTemplateDaAutomacao(supabase: Supabase, companyId: string, contato: Contato, config: Record<string, unknown>) {
  const nome = String(config.template_name || '')
  if (!nome) return 'mensagem não enviada: template não escolhido'
  const [company, { data: templateData }] = await Promise.all([
    credenciais(supabase, companyId),
    supabase.from('message_templates')
      .select('name, language, body, header_type, header_content, buttons, footer, status')
      .eq('company_id', companyId).eq('name', nome).single(),
  ])
  if (!templateData || templateData.status !== 'approved') return `mensagem não enviada: template "${nome}" não está aprovado`

  const envio = await enviarTemplate(
    { template_name: nome, template_language: String(config.template_language || templateData.language || 'pt_BR'), template_components: null },
    company,
    templateData,
    { phone: contato.phone, name: contato.name, campos: contato.custom_fields }
  )
  if (!envio.ok) return `template "${nome}" não enviado (${envio.erro})`
  await registrarNaConversa(supabase, companyId, contato.id, `[template: ${nome}]`, 'template', envio.waMessageId)
  return `template "${nome}" enviado`
}

async function enviarTextoDaAutomacao(supabase: Supabase, companyId: string, contato: Contato, texto: string) {
  if (!texto.trim()) return 'mensagem não enviada: texto vazio'

  // Janela de 24h: precisa de mensagem do cliente recente em alguma conversa dele
  const { data: conversas } = await supabase
    .from('conversations').select('id').eq('company_id', companyId).eq('contact_id', contato.id)
  const ids = (conversas || []).map((c) => c.id)
  const { data: ultima } = ids.length
    ? await supabase.from('messages').select('created_at')
        .in('conversation_id', ids).eq('direction', 'inbound')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
    : { data: null }
  if (!ultima || Date.now() - new Date(ultima.created_at).getTime() > DIA_MS) {
    return 'texto não enviado: o cliente não falou nas últimas 24h (use um template nesta etapa)'
  }

  const company = await credenciais(supabase, companyId)
  if (!company?.whatsapp_token || !company?.whatsapp_phone_number_id) return 'texto não enviado: API oficial do WhatsApp não configurada'

  const primeiroNome = (contato.name || '').split(' ')[0]
  const corpo = texto.replace(/\{\{nome\}\}/gi, primeiroNome).trim()
  const res = await fetch(`https://graph.facebook.com/v22.0/${company.whatsapp_phone_number_id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${company.whatsapp_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: contato.phone.replace(/\D/g, ''), type: 'text', text: { body: corpo } }),
  })
  const dados = await res.json().catch(() => null)
  if (!res.ok) return `texto não enviado (Meta: ${dados?.error?.message || res.status})`
  await registrarNaConversa(supabase, companyId, contato.id, corpo, 'text', dados?.messages?.[0]?.id || null)
  return 'texto enviado'
}

// Mostra a mensagem automática na conversa mais recente do contato, se houver
async function registrarNaConversa(supabase: Supabase, companyId: string, contactId: string, conteudo: string, tipo: string, waId: string | null) {
  const { data: conversa } = await supabase
    .from('conversations').select('id')
    .eq('company_id', companyId).eq('contact_id', contactId)
    .order('updated_at', { ascending: false }).limit(1).maybeSingle()
  if (!conversa) return
  await supabase.from('messages').insert({
    conversation_id: conversa.id, company_id: companyId, whatsapp_message_id: waId,
    direction: 'outbound', type: tipo, content: conteudo, status: 'sent',
  })
  await supabase.from('conversations').update({
    last_message: conteudo, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', conversa.id)
}
