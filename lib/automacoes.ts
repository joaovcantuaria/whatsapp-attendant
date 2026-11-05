import { createServiceRoleClient } from '@/lib/supabase-server'
import { consultarApp } from '@/lib/app-link'
import { enviarTemplate } from '@/lib/campanhas'
import {
  type TipoAutomacao, deveRodarHoje, montarVariaveis, partesSaoPaulo, variantesTelefone,
} from '@/lib/automacoes-regras'

/**
 * Motor das automações com o Bora Gerir App (chamado pelo /api/cron/processar a cada minuto):
 *  - aniversario: 1x/dia no horário de envio, para os aniversariantes do dia (cupom opcional)
 *  - reativacao: 1x/dia, para quem não aparece há N dias (cupom opcional)
 *  - lembrete_agendamento: a cada 15 min, para horários nas próximas N horas
 * Sempre por template aprovado (mensagem fora da janela de 24h), respeitando SAIR e limite diário.
 */

type Supabase = ReturnType<typeof createServiceRoleClient>

interface Automacao {
  id: string
  company_id: string
  type: TipoAutomacao
  template_name: string | null
  template_language: string | null
  vars: string[] | null
  config: {
    hora_envio?: string
    dias_inatividade?: number
    antecedencia_horas?: number
    limite_diario?: number
    cupom?: { tipo: 'percentual' | 'fixo'; valor: number; validade_dias: number } | null
  } | null
  last_run_on: string | null
  last_run_at: string | null
}

export interface Alvo {
  referencia: string
  telefone: string
  nome: string
  clienteId: string | null
  idade?: number | null
  diasSemVisita?: number | null
  servico?: string | null
  profissional?: string | null
  dataHora?: string | null
}

const INTERVALO_LEMBRETE_MS = 15 * 60 * 1000

/** Quem a automação deve receber agora, buscando no App. */
export async function buscarAlvos(automacao: Pick<Automacao, 'company_id' | 'type' | 'config'>): Promise<{ ok: true; alvos: Alvo[] } | { ok: false; erro: string }> {
  const cfg = automacao.config || {}
  if (automacao.type === 'aniversario') {
    const r = await consultarApp<{ clientes: { id: string; nome: string; telefone: string; idade: number }[] }>(automacao.company_id, 'aniversariantes?dias=0')
    if (!r.ok) return { ok: false, erro: r.erro }
    const ano = partesSaoPaulo(new Date()).ano
    return { ok: true, alvos: r.dados.clientes.map((c) => ({ referencia: `aniversario:${ano}`, telefone: c.telefone, nome: c.nome, clienteId: c.id, idade: c.idade })) }
  }
  if (automacao.type === 'reativacao') {
    const dias = Math.min(730, Math.max(15, Number(cfg.dias_inatividade) || 60))
    const r = await consultarApp<{ clientes: { id: string; nome: string; telefone: string; ultima_visita: string; dias_sem_visita: number }[] }>(
      automacao.company_id, `inativos?dias=${dias}&limite=500`)
    if (!r.ok) return { ok: false, erro: r.erro }
    // Uma mensagem por "sumiço": se o cliente voltar e sumir de novo, a referência muda
    return { ok: true, alvos: r.dados.clientes.map((c) => ({ referencia: `ultima:${c.ultima_visita.slice(0, 10)}`, telefone: c.telefone, nome: c.nome, clienteId: c.id, diasSemVisita: c.dias_sem_visita })) }
  }
  const horas = Math.min(72, Math.max(1, Number(cfg.antecedencia_horas) || 24))
  const r = await consultarApp<{ agendamentos: { id: string; nome: string; telefone: string; data_hora: string; servico: string | null; profissional: string | null; cliente_id: string | null }[] }>(
    automacao.company_id, `agendamentos?horas=${horas}`)
  if (!r.ok) return { ok: false, erro: r.erro }
  return { ok: true, alvos: r.dados.agendamentos.map((a) => ({ referencia: `agendamento:${a.id}`, telefone: a.telefone, nome: a.nome, clienteId: a.cliente_id, servico: a.servico, profissional: a.profissional, dataHora: a.data_hora })) }
}

function estaNaHora(a: Automacao, agora = new Date()): boolean {
  if (a.type === 'lembrete_agendamento') {
    return !a.last_run_at || agora.getTime() - new Date(a.last_run_at).getTime() >= INTERVALO_LEMBRETE_MS
  }
  return deveRodarHoje(a.config?.hora_envio, a.last_run_on, agora)
}

export async function processarAutomacoes(supabase: Supabase, prazo: number) {
  const resumo = { automacoes: 0, enviadas: 0, falhas: 0, puladas: 0 }
  const { data: ativas } = await supabase
    .from('automations')
    .select('id, company_id, type, template_name, template_language, vars, config, last_run_on, last_run_at')
    .eq('is_active', true)
    .not('template_name', 'is', null)
    .limit(50)

  for (const a of (ativas || []) as Automacao[]) {
    if (Date.now() > prazo) break
    if (!estaNaHora(a)) continue
    resumo.automacoes++
    const r = await rodarAutomacao(supabase, a, prazo)
    resumo.enviadas += r.enviadas
    resumo.falhas += r.falhas
    resumo.puladas += r.puladas
  }
  return resumo
}

async function rodarAutomacao(supabase: Supabase, a: Automacao, prazo: number) {
  const contagem = { enviadas: 0, falhas: 0, puladas: 0 }
  const hoje = partesSaoPaulo(new Date()).iso
  const marcarRodada = (completa: boolean) => supabase.from('automations').update({
    last_run_at: new Date().toISOString(),
    ...(completa ? { last_run_on: hoje } : {}),
  }).eq('id', a.id)

  const [{ data: company }, { data: templateData }, { data: link }] = await Promise.all([
    supabase.from('companies').select('name, whatsapp_token, whatsapp_phone_number_id').eq('id', a.company_id).single(),
    supabase.from('message_templates')
      .select('name, language, body, header_type, header_content, buttons, footer, status')
      .eq('company_id', a.company_id).eq('name', a.template_name!).single(),
    supabase.from('app_links').select('empresa_nome').eq('company_id', a.company_id).single(),
  ])
  if (!company?.whatsapp_token || !company?.whatsapp_phone_number_id || !templateData || templateData.status !== 'approved' || !link) {
    await marcarRodada(true) // configuração incompleta: tenta de novo amanhã (a tela mostra o motivo)
    return contagem
  }

  const alvos = await buscarAlvos(a)
  if (!alvos.ok) {
    await marcarRodada(false)
    return contagem
  }

  // Limite diário de envios desta automação
  const inicioDoDia = new Date(`${hoje}T00:00:00-03:00`).toISOString()
  const { count: enviadosHoje } = await supabase
    .from('automation_sends').select('id', { count: 'exact', head: true })
    .eq('automation_id', a.id).eq('status', 'sent').gte('created_at', inicioDoDia)
  let restante = Math.max(0, (Number(a.config?.limite_diario) || 200) - (enviadosHoje || 0))

  let completa = true
  for (const alvo of alvos.alvos) {
    if (restante <= 0) break
    if (Date.now() > prazo) { completa = false; break }

    // Reserva o envio: a chave única (automação, telefone, referência) impede repetir
    const { error: reserva } = await supabase.from('automation_sends').insert({
      automation_id: a.id, company_id: a.company_id, phone: alvo.telefone, contact_name: alvo.nome,
      reference: alvo.referencia, status: 'skipped', detail: 'enviando...',
    })
    if (reserva) continue // já foi tratado antes

    const resultado = await enviarParaAlvo(supabase, a, company, templateData, link.empresa_nome || company.name || '', alvo)
    await supabase.from('automation_sends')
      .update({ status: resultado.status, detail: resultado.detalhe })
      .eq('automation_id', a.id).eq('phone', alvo.telefone).eq('reference', alvo.referencia)

    if (resultado.status === 'sent') { contagem.enviadas++; restante-- }
    else if (resultado.status === 'failed') contagem.falhas++
    else contagem.puladas++
  }

  await marcarRodada(completa)
  return contagem
}

type Company = { name: string | null; whatsapp_token: string | null; whatsapp_phone_number_id: string | null }
type TemplateData = { name: string; language: string | null; body: string | null; header_type: string | null; header_content: string | null; buttons: unknown; footer: string | null }

async function enviarParaAlvo(
  supabase: Supabase, a: Automacao, company: Company, templateData: TemplateData, nomeEmpresa: string, alvo: Alvo
): Promise<{ status: 'sent' | 'failed' | 'skipped'; detalhe: string }> {
  const telefones = variantesTelefone(alvo.telefone)
  const { data: contatos } = await supabase
    .from('contacts').select('id, opted_out').eq('company_id', a.company_id).in('phone', telefones).limit(1)
  let contato = contatos?.[0] || null
  if (contato?.opted_out) return { status: 'skipped', detalhe: 'cliente pediu para não receber (SAIR)' }

  // Cupom (aniversário/reativação): sem cupom criado, não envia mensagem que promete cupom
  type Cupom = { codigo: string; tipo: string; valor: number; validade: string }
  let cupom: Cupom | null = null
  const cfgCupom = a.config?.cupom
  if (cfgCupom && a.type !== 'lembrete_agendamento') {
    if (!alvo.clienteId) return { status: 'skipped', detalhe: 'sem cadastro no App para gerar cupom' }
    const r = await consultarApp<{ cupom: Cupom | null }>(a.company_id, 'cupons', {
      cliente_id: alvo.clienteId, origem: a.type, tipo: cfgCupom.tipo, valor: cfgCupom.valor, validade_dias: cfgCupom.validade_dias,
    })
    if (!r.ok || !r.dados.cupom) return { status: 'failed', detalhe: `cupom não criado no App (${r.ok ? 'sem cupom' : r.erro})` }
    cupom = r.dados.cupom
  }

  const valores = montarVariaveis(a.vars || [], {
    nome: alvo.nome, empresa: nomeEmpresa, cupom, idade: alvo.idade, dias_sem_visita: alvo.diasSemVisita,
    servico: alvo.servico, profissional: alvo.profissional, data_hora: alvo.dataHora,
  })
  const varsMapping = Object.fromEntries(valores.map((v, i) => [`{{${i + 1}}}`, v]))

  const envio = await enviarTemplate(
    { template_name: a.template_name!, template_language: a.template_language || templateData.language || 'pt_BR', template_components: { vars_mapping: varsMapping } },
    company, templateData, { phone: alvo.telefone, name: alvo.nome, campos: null }
  )
  if (!envio.ok) return { status: 'failed', detalhe: envio.erro }

  // Registra no histórico do contato: quando ele responder, a conversa reabre com o contexto
  if (!contato) {
    const { data: novo } = await supabase.from('contacts')
      .insert({ company_id: a.company_id, phone: alvo.telefone, name: alvo.nome }).select('id, opted_out').single()
    contato = novo
  }
  if (contato) {
    let { data: conversa } = await supabase.from('conversations').select('id')
      .eq('company_id', a.company_id).eq('contact_id', contato.id)
      .order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (!conversa) {
      const { data: nova } = await supabase.from('conversations')
        .insert({ company_id: a.company_id, contact_id: contato.id, status: 'closed', channel: 'whatsapp' }).select('id').single()
      conversa = nova
    }
    if (conversa) {
      const texto = `[automação: ${a.type.replace('_', ' ')}] template ${a.template_name}${cupom ? ` · cupom ${cupom.codigo}` : ''}`
      await supabase.from('messages').insert({
        conversation_id: conversa.id, company_id: a.company_id, whatsapp_message_id: envio.waMessageId,
        direction: 'outbound', type: 'template', content: texto, template_name: a.template_name, status: 'sent',
      })
    }
  }
  return { status: 'sent', detalhe: cupom ? `enviado com cupom ${cupom.codigo}` : 'enviado' }
}
