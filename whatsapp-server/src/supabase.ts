import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

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

  // 1. Buscar empresa pela instanceId (company_id)
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('id', instanceId)
    .single()

  if (!company) {
    console.log(`[Supabase] Empresa não encontrada: ${instanceId}`)
    return
  }

  // 2. Buscar ou criar contato
  let { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone', phone)
    .eq('company_id', company.id)
    .single()

  if (!contact) {
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        phone,
        name: pushName || null,
        company_id: company.id,
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
    .eq('company_id', company.id)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!conversation) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        contact_id: contact.id,
        company_id: company.id,
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
    await supabase
      .from('conversations')
      .update({
        last_message: content,
        last_message_at: timestamp,
        unread_count: fromMe ? 0 : supabase.rpc('increment_unread', { conv_id: conversation.id }),
      })
      .eq('id', conversation.id)
  }

  if (!conversation) return

  // 4. Salvar mensagem
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    content,
    sender_type: fromMe ? 'agent' : 'contact',
    message_type: 'text',
    external_id: messageId,
    created_at: timestamp,
  })

  // 5. Atualizar last_message na conversa
  if (!fromMe) {
    await supabase
      .from('conversations')
      .update({
        last_message: content,
        last_message_at: timestamp,
      })
      .eq('id', conversation.id)
  }
}

export async function updateContactName(instanceId: string, phone: string, name: string) {
  await supabase
    .from('contacts')
    .update({ name })
    .eq('phone', phone)
    .is('name', null)
}
