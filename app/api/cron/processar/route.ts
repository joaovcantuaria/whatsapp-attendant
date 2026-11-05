import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { prepararCampanha, processarLoteCampanha } from '@/lib/campanhas'
import { WHATSAPP_SERVER_URL, WHATSAPP_SERVER_API_KEY } from '@/lib/whatsapp-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * /api/cron/processar — chamado a cada minuto (Supabase pg_cron) e 1x/dia pela Vercel.
 * 1) Dispara campanhas agendadas que chegaram na hora
 * 2) Continua as filas de campanhas em andamento
 * 3) Envia as mensagens agendadas (scheduled_messages)
 *
 * Autenticação: header "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: NextRequest) {
  return processar(request)
}

export async function POST(request: NextRequest) {
  return processar(request)
}

async function processar(request: NextRequest) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || request.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const prazo = Date.now() + 50_000
  const supabase = createServiceRoleClient()
  const resumo = { campanhas_iniciadas: 0, campanha_enviadas: 0, campanha_falhas: 0, agendadas_enviadas: 0, agendadas_falhas: 0 }
  const agora = new Date().toISOString()

  // 1) Campanhas agendadas
  const { data: agendadas } = await supabase
    .from('campaigns').select('*')
    .eq('status', 'scheduled').lte('scheduled_at', agora)
    .limit(5)
  for (const campanha of agendadas || []) {
    const preparo = await prepararCampanha(supabase, campanha)
    if (preparo.ok) resumo.campanhas_iniciadas++
    else {
      await supabase.from('campaigns')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', campanha.id).eq('status', 'scheduled')
      console.error(`[cron] campanha ${campanha.id} não iniciou: ${preparo.erro}`)
    }
  }

  // 2) Filas em andamento (mais antigas primeiro)
  const { data: emAndamento } = await supabase
    .from('campaigns').select('id')
    .eq('status', 'running')
    .order('started_at', { ascending: true })
    .limit(5)
  for (const { id } of emAndamento || []) {
    if (Date.now() > prazo) break
    const lote = await processarLoteCampanha(supabase, id, 60, prazo)
    resumo.campanha_enviadas += lote.enviadas
    resumo.campanha_falhas += lote.falhas
  }

  // 3) Mensagens agendadas
  if (Date.now() < prazo) {
    const r = await enviarMensagensAgendadas(supabase, prazo)
    resumo.agendadas_enviadas = r.enviadas
    resumo.agendadas_falhas = r.falhas
  }

  return NextResponse.json({ ok: true, ...resumo })
}

type Supabase = ReturnType<typeof createServiceRoleClient>

async function enviarMensagensAgendadas(supabase: Supabase, prazo: number) {
  const { data: candidatas } = await supabase
    .from('scheduled_messages').select('id')
    .eq('status', 'pending').is('sent_at', null)
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(30)

  // Reserva: preenche sent_at antes de enviar (status só aceita pending/sent/failed/cancelled)
  const ids = (candidatas || []).map((c) => c.id)
  const { data: lote } = ids.length
    ? await supabase.from('scheduled_messages')
        .update({ sent_at: new Date().toISOString() })
        .in('id', ids).eq('status', 'pending').is('sent_at', null)
        .select('id, company_id, conversation_id, phone, content')
    : { data: [] }

  let enviadas = 0
  let falhas = 0
  const credenciais = new Map<string, { whatsapp_token: string | null; whatsapp_phone_number_id: string | null } | null>()

  for (const msg of lote || []) {
    if (Date.now() > prazo) {
      await supabase.from('scheduled_messages').update({ sent_at: null }).eq('id', msg.id)
      continue
    }

    if (!credenciais.has(msg.company_id)) {
      const { data } = await supabase.from('companies')
        .select('whatsapp_token, whatsapp_phone_number_id').eq('id', msg.company_id).single()
      credenciais.set(msg.company_id, data)
    }
    const company = credenciais.get(msg.company_id)
    const phone = String(msg.phone || '').replace(/\D/g, '')
    const resultado = await enviarTexto(company, msg.company_id, phone, msg.content)

    await supabase.from('scheduled_messages')
      .update({ status: resultado.ok ? 'sent' : 'failed', sent_at: new Date().toISOString() })
      .eq('id', msg.id)

    if (!resultado.ok) {
      falhas++
      console.error(`[cron] mensagem agendada ${msg.id} falhou: ${resultado.erro}`)
      continue
    }
    enviadas++

    if (msg.conversation_id) {
      await supabase.from('messages').insert({
        conversation_id: msg.conversation_id,
        company_id: msg.company_id,
        whatsapp_message_id: resultado.messageId,
        direction: 'outbound',
        type: 'text',
        content: msg.content,
        status: 'sent',
      })
      await supabase.from('conversations').update({
        last_message: msg.content,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', msg.conversation_id)
    }
  }

  return { enviadas, falhas }
}

// Mesmo critério do /api/send-message: com token da Meta usa a API oficial, senão o servidor QR Code
async function enviarTexto(
  company: { whatsapp_token: string | null; whatsapp_phone_number_id: string | null } | null | undefined,
  companyId: string,
  phone: string,
  texto: string
): Promise<{ ok: true; messageId: string | null } | { ok: false; erro: string }> {
  if (!phone) return { ok: false, erro: 'Telefone inválido' }
  try {
    if (company?.whatsapp_token && company?.whatsapp_phone_number_id) {
      const res = await fetch(`https://graph.facebook.com/v22.0/${company.whatsapp_phone_number_id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${company.whatsapp_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'text', text: { preview_url: true, body: texto } }),
      })
      const dados = await res.json().catch(() => null)
      if (!res.ok) return { ok: false, erro: `Meta API [${dados?.error?.code || '?'}]: ${dados?.error?.message || 'erro'}` }
      return { ok: true, messageId: dados?.messages?.[0]?.id || null }
    }

    const res = await fetch(`${WHATSAPP_SERVER_URL}/api/message/send-text`, {
      method: 'POST',
      headers: { 'x-api-key': WHATSAPP_SERVER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId: companyId, phone, message: texto, skipSave: true }),
      signal: AbortSignal.timeout(15000),
    })
    const dados = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, erro: dados.error || 'Erro no servidor QR Code' }
    return { ok: true, messageId: dados.messageId || null }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'erro desconhecido' }
  }
}
