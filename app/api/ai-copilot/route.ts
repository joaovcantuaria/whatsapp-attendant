import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { membroAtual } from '@/lib/membro-atual'
import { carregarConfigIA, chamarIA, conhecimentoParaPergunta, type MensagemIA } from '@/lib/ia'
import { rateLimitSimples } from '@/lib/rate-limit-simples'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Copiloto do atendente (não envia nada ao cliente):
 *  - acao 'sugerir': rascunho de resposta para a última mensagem do cliente
 *  - acao 'resumir': resumo da conversa para quem assume o atendimento
 * Usa a chave e o modelo configurados no Agente de IA da empresa.
 */
export async function POST(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (!rateLimitSimples(`copiloto:${membro.userId}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Muitos pedidos ao copiloto. Aguarde um minuto.' }, { status: 429 })
  }

  const { conversationId, acao } = await request.json().catch(() => ({}))
  if (typeof conversationId !== 'string' || (acao !== 'sugerir' && acao !== 'resumir')) {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data: conversa } = await supabase
    .from('conversations')
    .select('id, company_id, contact:contacts(name)')
    .eq('id', conversationId)
    .eq('company_id', membro.companyId)
    .single()
  if (!conversa) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const config = await carregarConfigIA(supabase, membro.companyId)
  if (!config) {
    return NextResponse.json({ error: 'Configure a chave de IA em Agente de IA → Configuração para usar o copiloto' }, { status: 400 })
  }

  const { data: mensagens } = await supabase
    .from('messages')
    .select('direction, content, type, transcription')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(acao === 'resumir' ? 60 : 20)

  const historico = (mensagens || [])
    .reverse()
    .filter((m) => m.direction !== 'internal') // notas internas não entram
    .map((m) => ({
      quem: m.direction === 'inbound' ? 'Cliente' : 'Atendente',
      texto: (m.content || m.transcription || `[${m.type}]`).slice(0, 1000),
    }))
  if (historico.length === 0) return NextResponse.json({ error: 'Conversa sem mensagens' }, { status: 400 })

  const contato = Array.isArray(conversa.contact) ? conversa.contact[0] : conversa.contact
  const nomeCliente = (contato as { name?: string } | null)?.name || 'cliente'
  const transcricao = historico.map((h) => `${h.quem}: ${h.texto}`).join('\n')

  let prompt: MensagemIA[]
  if (acao === 'sugerir') {
    const ultimaDoCliente = [...historico].reverse().find((h) => h.quem === 'Cliente')?.texto || ''
    const conhecimento = await conhecimentoParaPergunta(supabase, membro.companyId, ultimaDoCliente)
    prompt = [
      {
        role: 'system',
        content: `${config.system_prompt || ''}

Você é o copiloto de um atendente humano no WhatsApp. Escreva UMA resposta curta, cordial e em português do Brasil para a última mensagem do cliente (${nomeCliente}), pronta para o atendente revisar e enviar. Não use saudações longas nem assinatura. Se faltar informação, faça uma pergunta objetiva em vez de inventar.${conhecimento}`,
      },
      { role: 'user', content: `Conversa até agora:\n${transcricao}\n\nEscreva só a resposta do atendente.` },
    ]
  } else {
    prompt = [
      {
        role: 'system',
        content: 'Resuma conversas de atendimento para um atendente que vai assumir. Responda em português do Brasil, em até 5 tópicos curtos: o que o cliente quer, o que já foi feito/combinado, pendências e o próximo passo sugerido. Sem inventar.',
      },
      { role: 'user', content: transcricao },
    ]
  }

  const resposta = await chamarIA(config, prompt, { temperatura: acao === 'sugerir' ? 0.5 : 0.2, maxTokens: acao === 'sugerir' ? 300 : 400 })
  if (!resposta.ok) return NextResponse.json({ error: `A IA não respondeu (${resposta.erro})` }, { status: 502 })
  return NextResponse.json({ texto: resposta.texto })
}
