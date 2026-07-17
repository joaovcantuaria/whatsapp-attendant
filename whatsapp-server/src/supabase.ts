import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '',
  {
    auth: { persistSession: false },
  }
)

// Log de conexão
console.log(`[Supabase] Conectando em: ${process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'NÃO CONFIGURADO'}`)

interface IncomingMessage {
  instanceId: string
  phone: string
  content: string
  pushName: string
  timestamp: string
  fromMe: boolean
  messageId: string
}

export async function saveMessageToSupabase(msg: IncomingMessage) {
  const { instanceId, phone, content, pushName, timestamp, fromMe, messageId } = msg

  // 1. Buscar empresa - tentar por instanceId, senão buscar pela mais recente
  let companyId: string | null = null
  
  // Tentar buscar por UUID
  if (instanceId && instanceId !== 'default') {
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('id', instanceId)
      .maybeSingle()
    companyId = company?.id || null
  }

  // Fallback: buscar a empresa mais recente (última criada)
  if (!companyId) {
    // Primeiro checar se tem env var definida
    if (process.env.DEFAULT_COMPANY_ID) {
      companyId = process.env.DEFAULT_COMPANY_ID
      console.log(`[Supabase] Usando empresa da env: ${companyId}`)
    } else {
      const { data: latestCompany, error: compError } = await supabase
        .from('companies')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (compError) {
        console.log(`[Supabase] Erro ao buscar empresa: ${compError.message}`)
        return
      }
      companyId = latestCompany?.id || null
      if (companyId) {
        console.log(`[Supabase] Usando empresa mais recente: ${companyId}`)
      }
    }
  }

  if (!companyId) {
    console.log(`[Supabase] Nenhuma empresa no banco`)
    return
  }

  // 2. Buscar ou criar contato
  let { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone', phone)
    .eq('company_id', companyId)
    .single()

  if (!contact) {
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        phone,
        name: pushName || null,
        company_id: companyId,
      })
      .select('id')
      .single()
    contact = newContact
  }

  if (!contact) return

  // 3. Buscar ou criar conversa
  let { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', contact.id)
    .eq('company_id', companyId)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!conversation) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        contact_id: contact.id,
        company_id: companyId,
        channel: 'whatsapp',
        status: 'pending',
        last_message: content,
        last_message_at: timestamp,
        unread_count: fromMe ? 0 : 1,
      })
      .select('id')
      .single()
    conversation = newConv
  } else {
    // Atualizar conversa existente
    const updates: any = {
      last_message: content,
      last_message_at: timestamp,
    }
    if (!fromMe) {
      // Incrementar unread
      const { data: currentConv } = await supabase
        .from('conversations')
        .select('unread_count')
        .eq('id', conversation.id)
        .single()
      updates.unread_count = (currentConv?.unread_count || 0) + 1
    }
    await supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversation.id)
  }

  if (!conversation) return

  // 4. Salvar mensagem
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    company_id: companyId,
    whatsapp_message_id: messageId,
    direction: fromMe ? 'outbound' : 'inbound',
    type: 'text',
    content,
    status: fromMe ? 'sent' : 'delivered',
    created_at: timestamp,
  })

  console.log(`[Supabase] ✅ Mensagem salva: ${phone} → ${content.substring(0, 30)}`)
}

export async function updateContactName(instanceId: string, phone: string, name: string) {
  await supabase
    .from('contacts')
    .update({ name })
    .eq('phone', phone)
    .is('name', null)
}
