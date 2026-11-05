import { createServiceRoleClient } from '@/lib/supabase-server'
import { buildTemplateComponents } from '@/lib/template-utils'

/**
 * Fila de campanhas: "Enviar" cria uma linha 'pending' por contato em campaign_messages;
 * os envios saem em lotes (na hora e a cada minuto pelo /api/cron/processar), sem
 * depender de uma única requisição longa — que a Vercel cortava no meio.
 */

type Supabase = ReturnType<typeof createServiceRoleClient>

const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0'
const INTERVALO_ENTRE_ENVIOS_MS = 500
const DEFAULT_HEADER_IMAGE = 'https://edrfxjigpwdoxcybqnbt.supabase.co/storage/v1/object/public/uploads/ca9a769a-281b-428d-afed-b65ffa84e4ab/1784044314175_confirma_es.png'

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string }

interface Campanha {
  id: string
  company_id: string
  status: string
  template_name: string
  template_language: string | null
  template_components: { vars_mapping?: Record<string, string> | null; header_media_url?: string | null } | null
  contact_ids: string[]
}

/** Valida template e WhatsApp, cria a fila e marca a campanha como 'running'. */
export async function prepararCampanha(supabase: Supabase, campanha: Campanha): Promise<Resultado<{ total: number }>> {
  const { data: template } = await supabase
    .from('message_templates')
    .select('id, status')
    .eq('company_id', campanha.company_id)
    .eq('name', campanha.template_name)
    .single()

  if (!template) {
    return { ok: false, erro: `Template "${campanha.template_name}" não encontrado. Sincronize os templates com a Meta.` }
  }
  if (template.status !== 'approved') {
    return { ok: false, erro: `Template "${campanha.template_name}" não está aprovado (status: ${template.status}). Apenas templates aprovados pela Meta podem ser enviados.` }
  }

  const { data: company } = await supabase
    .from('companies')
    .select('whatsapp_token, whatsapp_phone_number_id')
    .eq('id', campanha.company_id)
    .single()
  if (!company?.whatsapp_token || !company?.whatsapp_phone_number_id) return { ok: false, erro: 'WhatsApp não configurado' }

  const { data: contatos } = await supabase
    .from('contacts')
    .select('id, phone')
    .in('id', campanha.contact_ids || [])
    // Quem respondeu SAIR não recebe campanhas
    .or('opted_out.is.null,opted_out.eq.false')
  if (!contatos || contatos.length === 0) return { ok: false, erro: 'Nenhum contato encontrado' }

  // Marca 'running' só se ainda estiver em draft/scheduled: dois cliques não duplicam a fila
  const { data: marcada } = await supabase
    .from('campaigns')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      total_contacts: contatos.length,
      sent_count: 0,
      failed_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campanha.id)
    .in('status', ['draft', 'scheduled'])
    .select('id')
  if (!marcada || marcada.length === 0) return { ok: false, erro: 'Campanha não pode ser enviada neste status' }

  const { error } = await supabase.from('campaign_messages').insert(
    contatos.map((c) => ({ campaign_id: campanha.id, contact_id: c.id, phone: c.phone, status: 'pending' }))
  )
  if (error) {
    await supabase.from('campaigns').update({ status: campanha.status, updated_at: new Date().toISOString() }).eq('id', campanha.id)
    return { ok: false, erro: 'Erro ao montar a fila de envio' }
  }

  return { ok: true, total: contatos.length }
}

/** Envia até `limite` mensagens pendentes da campanha (ou até estourar `prazo`). */
export async function processarLoteCampanha(
  supabase: Supabase,
  campanhaId: string,
  limite: number,
  prazo = Date.now() + 45_000
): Promise<{ enviadas: number; falhas: number; concluida: boolean }> {
  const { data: campanha } = await supabase
    .from('campaigns')
    .select('id, company_id, status, template_name, template_language, template_components')
    .eq('id', campanhaId)
    .single()
  if (!campanha || campanha.status !== 'running') return { enviadas: 0, falhas: 0, concluida: true }

  const [{ data: company }, { data: templateData }] = await Promise.all([
    supabase.from('companies').select('whatsapp_token, whatsapp_phone_number_id').eq('id', campanha.company_id).single(),
    supabase.from('message_templates')
      .select('name, language, body, header_type, header_content, buttons, footer')
      .eq('company_id', campanha.company_id).eq('name', campanha.template_name).single(),
  ])

  // Reserva o lote: só fica com as linhas que ainda estavam 'pending' (outro processamento não pega as mesmas)
  const { data: candidatas } = await supabase
    .from('campaign_messages').select('id').eq('campaign_id', campanhaId).eq('status', 'pending').limit(limite)
  const ids = (candidatas || []).map((c) => c.id)
  const { data: lote } = ids.length
    ? await supabase.from('campaign_messages').update({ status: 'sending' })
        .in('id', ids).eq('status', 'pending')
        .select('id, contact_id, phone')
    : { data: [] }

  // campaign_messages não tem FK para contacts: busca os nomes à parte
  const idsContatos = (lote || []).map((l) => l.contact_id)
  const { data: contatos } = idsContatos.length
    ? await supabase.from('contacts').select('id, name, custom_fields').in('id', idsContatos)
    : { data: [] }
  const porId = new Map((contatos || []).map((c) => [c.id, c as { name: string | null; custom_fields: Record<string, unknown> | null }]))

  let enviadas = 0
  let falhas = 0

  for (const item of lote || []) {
    const resultado = Date.now() > prazo
      ? null
      : await enviarTemplate(campanha, company, templateData, {
          phone: item.phone,
          name: porId.get(item.contact_id)?.name || null,
          campos: porId.get(item.contact_id)?.custom_fields || null,
        })

    if (!resultado) {
      // Sem tempo neste lote: devolve para a fila
      await supabase.from('campaign_messages').update({ status: 'pending' }).eq('id', item.id)
      continue
    }

    await supabase.from('campaign_messages').update(
      resultado.ok
        ? { status: 'sent', whatsapp_message_id: resultado.waMessageId, sent_at: new Date().toISOString(), error_message: null }
        : { status: 'failed', error_message: resultado.erro }
    ).eq('id', item.id)
    if (resultado.ok) enviadas++
    else falhas++

    await new Promise((r) => setTimeout(r, INTERVALO_ENTRE_ENVIOS_MS))
  }

  return { enviadas, falhas, concluida: await finalizarSeAcabou(supabase, campanhaId) }
}

/** Atualiza contadores; quando não há mais pendentes, marca a campanha como concluída. */
async function finalizarSeAcabou(supabase: Supabase, campanhaId: string): Promise<boolean> {
  const contar = async (status: string) => {
    const { count } = await supabase
      .from('campaign_messages').select('id', { count: 'exact', head: true })
      .eq('campaign_id', campanhaId).eq('status', status)
    return count || 0
  }
  const [pendentes, enviando, enviadas, falhas] = await Promise.all([contar('pending'), contar('sending'), contar('sent'), contar('failed')])
  const concluida = pendentes === 0 && enviando === 0

  await supabase.from('campaigns').update({
    sent_count: enviadas,
    failed_count: falhas,
    updated_at: new Date().toISOString(),
    ...(concluida ? { status: 'completed', completed_at: new Date().toISOString() } : {}),
  }).eq('id', campanhaId).eq('status', 'running')

  return concluida
}

type TemplateData = {
  name: string; language: string | null; body: string | null; header_type: string | null
  header_content: string | null; buttons: unknown; footer: string | null
} | null

async function enviarTemplate(
  campanha: Pick<Campanha, 'template_name' | 'template_language' | 'template_components'>,
  company: { whatsapp_token: string | null; whatsapp_phone_number_id: string | null } | null,
  templateData: TemplateData,
  contato: { phone: string; name: string | null; campos?: Record<string, unknown> | null }
): Promise<{ ok: true; waMessageId: string | null } | { ok: false; erro: string }> {
  if (!company?.whatsapp_token || !company?.whatsapp_phone_number_id) return { ok: false, erro: 'WhatsApp não configurado' }

  // Normalizar telefone para formato E.164 (só dígitos)
  const phone = contato.phone.replace(/\D/g, '')
  if (!phone || phone.length < 10) return { ok: false, erro: `Telefone inválido: "${contato.phone}" (${phone.length} dígitos)` }

  try {
    // Resolver variáveis para este contato
    const varsMapping = campanha.template_components?.vars_mapping || null
    const templateBodyVars = templateData?.body?.match(/\{\{\d+\}\}/g)
    const resolvedVars: Record<string, string> = {}
    if (templateBodyVars && templateBodyVars.length > 0) {
      for (let i = 1; i <= templateBodyVars.length; i++) {
        const key = `{{${i}}}`
        const mapping = varsMapping ? varsMapping[key] || '' : ''
        if (mapping === '{{contact_name}}') resolvedVars[key] = contato.name || phone
        else if (mapping === '{{contact_phone}}') resolvedVars[key] = contato.phone
        else if (mapping === '__custom__') resolvedVars[key] = (varsMapping ? varsMapping[`${key}_custom`] : '') || '-'
        else if (mapping) resolvedVars[key] = mapping
        else resolvedVars[key] = i === 1 ? (contato.name || phone) : '-'

        // {{campo:chave}} → valor do campo personalizado do contato
        const campo = resolvedVars[key].match(/^\{\{campo:([a-z0-9_]+)\}\}$/)
        if (campo) resolvedVars[key] = String(contato.campos?.[campo[1]] ?? '') || '-'
      }
    }

    // Se o template tem header de mídia e não tem URL fornecida, usar fallback
    let headerMediaUrl = campanha.template_components?.header_media_url || undefined
    if (!headerMediaUrl && templateData?.header_type &&
        ['image', 'video', 'document'].includes(templateData.header_type.toLowerCase())) {
      headerMediaUrl = templateData.header_content?.startsWith('http') ? templateData.header_content : DEFAULT_HEADER_IMAGE
    }

    const components = buildTemplateComponents(
      {
        name: templateData?.name || campanha.template_name,
        language: templateData?.language || campanha.template_language || 'pt_BR',
        header_type: templateData?.header_type || null,
        header_content: templateData?.header_content || null,
        body: templateData?.body || '',
        footer: templateData?.footer || null,
        buttons: (templateData?.buttons as never) || null,
      },
      resolvedVars,
      headerMediaUrl
    )

    const template: Record<string, unknown> = {
      name: campanha.template_name,
      language: { code: campanha.template_language || 'pt_BR' },
    }
    if (components.length > 0) template.components = components

    const res = await fetch(`${WHATSAPP_API_URL}/${company.whatsapp_phone_number_id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${company.whatsapp_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'template', template }),
    })
    const dados = await res.json().catch(() => null)

    if (res.ok) return { ok: true, waMessageId: dados?.messages?.[0]?.id || null }
    return {
      ok: false,
      erro: dados?.error
        ? `[${dados.error.code || '?'}] ${dados.error.message || 'Sem detalhes'} | Template: ${campanha.template_name} | Phone: ${contato.phone}`
        : 'Erro desconhecido',
    }
  } catch (err) {
    return { ok: false, erro: `Erro de conexão: ${err instanceof Error ? err.message : 'desconhecido'}` }
  }
}
