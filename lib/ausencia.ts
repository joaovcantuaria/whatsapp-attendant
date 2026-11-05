import type { createServiceRoleClient } from '@/lib/supabase-server'

/**
 * Horário de atendimento e mensagem de ausência.
 * business_hours: { "0": null, "1": ["08:00","18:00"], ..., "6": ["08:00","12:00"] }
 * (0 = domingo; null = fechado o dia todo). Sem configuração = sempre aberto.
 */

type Supabase = ReturnType<typeof createServiceRoleClient>
export type HorarioAtendimento = Record<string, [string, string] | null>

// Não repete a ausência para a mesma conversa dentro deste intervalo
const INTERVALO_AUSENCIA_MS = 12 * 60 * 60 * 1000

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export const MENSAGEM_AUSENCIA_PADRAO =
  'Olá! Recebemos sua mensagem, mas estamos fora do horário de atendimento agora. Responderemos assim que voltarmos. 😊'

// Dia da semana (0-6) e minutos do dia no fuso de São Paulo
export function agoraEmSaoPaulo(agora = new Date()): { dia: number; minutos: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(agora)
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value || ''
  const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(valor('weekday'))
  const hora = Number(valor('hour')) % 24 // "24" à meia-noite em alguns ambientes
  return { dia, minutos: hora * 60 + Number(valor('minute')) }
}

const paraMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function horarioValido(h: unknown): h is HorarioAtendimento {
  if (!h || typeof h !== 'object' || Array.isArray(h)) return false
  return Object.entries(h as Record<string, unknown>).every(([dia, faixa]) =>
    /^[0-6]$/.test(dia) && (faixa === null || (
      Array.isArray(faixa) && faixa.length === 2 &&
      faixa.every((x) => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x)) &&
      paraMinutos(faixa[0] as string) < paraMinutos(faixa[1] as string)
    ))
  )
}

export function estaAberto(horario: HorarioAtendimento | null | undefined, agora = new Date()): boolean {
  if (!horario || !horarioValido(horario)) return true
  const { dia, minutos } = agoraEmSaoPaulo(agora)
  const faixa = horario[String(dia)]
  if (!faixa) return false
  return minutos >= paraMinutos(faixa[0]) && minutos < paraMinutos(faixa[1])
}

/**
 * Se a empresa ativou a ausência e está fora do horário, responde uma vez a cada 12h por conversa.
 * Usa a API oficial (a mensagem do cliente abriu a janela de 24h).
 */
export async function responderAusenciaSeFechado(
  supabase: Supabase,
  params: { companyId: string; conversationId: string; phone: string; whatsappToken?: string | null; phoneNumberId?: string | null }
): Promise<boolean> {
  const { companyId, conversationId, phone, whatsappToken, phoneNumberId } = params
  if (!whatsappToken || !phoneNumberId) return false

  const { data: company } = await supabase
    .from('companies')
    .select('business_hours, away_enabled, away_message')
    .eq('id', companyId)
    .single()
  if (!company?.away_enabled || estaAberto(company.business_hours)) return false

  // Reserva: só quem conseguir gravar away_sent_at envia (evita duas mensagens seguidas)
  const limite = new Date(Date.now() - INTERVALO_AUSENCIA_MS).toISOString()
  const { data: reservada } = await supabase
    .from('conversations')
    .update({ away_sent_at: new Date().toISOString() })
    .eq('id', conversationId)
    .or(`away_sent_at.is.null,away_sent_at.lt.${limite}`)
    .select('id')
  if (!reservada || reservada.length === 0) return false

  const texto = (company.away_message || '').trim() || MENSAGEM_AUSENCIA_PADRAO
  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: texto } }),
    })
    if (!res.ok) return false
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
    return true
  } catch {
    return false
  }
}
