import type { createServiceRoleClient } from '@/lib/supabase-server'

/**
 * Links e QR Codes de entrada: wa.me com uma mensagem pronta terminando em #CODIGO.
 * Quando o cliente manda essa mensagem, o Chat registra de onde ele veio (primeiro
 * contato), aplica a etiqueta e coloca a conversa no departamento do link.
 */

type Supabase = ReturnType<typeof createServiceRoleClient>

// Sem 0/O/1/I para ninguém confundir ao digitar
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function gerarCodigoLink(nome: string, aleatorio = Math.random): string {
  const base = nome.toUpperCase().normalize('NFD').replace(/[^A-Z]/g, '').replace(/[OI]/g, '').slice(0, 5) || 'LINK'
  const sufixo = Array.from({ length: 2 }, () => ALFABETO[Math.floor(aleatorio() * ALFABETO.length)]).join('')
  return `${base}${sufixo}`
}

export function extrairCodigo(texto: string | null | undefined): string | null {
  const m = (texto || '').match(/#([A-Za-z0-9]{3,12})\b/)
  return m ? m[1].toUpperCase() : null
}

export function mensagemComCodigo(mensagem: string, codigo: string): string {
  return `${mensagem.trim()} #${codigo}`
}

export function linkWhatsApp(telefone: string, mensagem: string, codigo: string): string {
  return `https://wa.me/${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(mensagemComCodigo(mensagem, codigo))}`
}

/** Chamado pelos webhooks para cada mensagem de texto recebida. */
export async function aplicarLinkDeEntrada(
  supabase: Supabase,
  params: { companyId: string | null; contactId: string; conversationId: string; texto: string | null }
): Promise<void> {
  const codigo = extrairCodigo(params.texto)
  if (!codigo || !params.companyId) return

  const { data: link } = await supabase
    .from('entry_links')
    .select('id, name, department_id, tag, uses')
    .eq('company_id', params.companyId)
    .eq('code', codigo)
    .maybeSingle()
  if (!link) return

  const { data: contato } = await supabase
    .from('contacts').select('entry_link_id, origin_channel, tags').eq('id', params.contactId).single()

  // Origem = primeiro link que trouxe o contato; a etiqueta acumula
  const tags = new Set<string>(contato?.tags || [])
  if (link.tag) tags.add(link.tag)
  await supabase.from('contacts').update({
    ...(contato?.entry_link_id ? {} : { entry_link_id: link.id, origin_channel: `link: ${link.name}`.slice(0, 60) }),
    tags: Array.from(tags),
  }).eq('id', params.contactId)

  // Departamento do link (o banco distribui para alguém online, se o depto distribui)
  if (link.department_id) {
    await supabase.from('conversations')
      .update({ department_id: link.department_id })
      .eq('id', params.conversationId)
      .is('agent_id', null)
  }

  await supabase.from('entry_links').update({ uses: (link.uses || 0) + 1 }).eq('id', link.id)
}
