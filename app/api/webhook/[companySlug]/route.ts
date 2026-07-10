import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getMediaUrl, markMessageAsRead } from '@/lib/meta'
import { checkConversationLimit, incrementUsage, isCompanyActive } from '@/lib/plan-limits'
import { WebhookMessage, WebhookStatus } from '@/types'

// GET - Validação do webhook pela Meta (por empresa)
export async function GET(
  request: NextRequest,
  { params }: { params: { companySlug: string } }
) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expectedToken = `${params.companySlug}_${process.env.WEBHOOK_SECRET}`

  if (mode === 'subscribe' && token === expectedToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST - Receber mensagens (por empresa)
export async function POST(
  request: NextRequest,
  { params }: { params: { companySlug: string } }
) {
  try {
    const supabase = createServiceRoleClient()

    // Buscar empresa pelo slug
    const { data: company } = await supabase
      .from('companies')
      .select('id, plan_status, trial_ends_at, whatsapp_token, whatsapp_phone_number_id')
      .eq('slug', params.companySlug)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Verificar se plano está ativo
    if (!isCompanyActive(company.plan_status, company.trial_ends_at)) {
      return NextResponse.json({ status: 'suspended' }, { status: 403 })
    }

    const body = await request.json()
    const entries = body.entry || []

    for (const entry of entries) {
      const changes = entry.changes || []

      for (const change of changes) {
        if (change.field !== 'messages') continue
        const value = change.value

        if (value.messages) {
          for (const message of value.messages) {
            await processInboundMessage(supabase, message, value.contacts?.[0], company.id, company.whatsapp_token!)
          }
        }

        if (value.statuses) {
          for (const status of value.statuses) {
            await processStatusUpdate(supabase, status, company.id)
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ status: 'ok' })
  }
}

async function processInboundMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  message: WebhookMessage,
  contactInfo: { profile?: { name?: string }; wa_id?: string } | undefined,
  companyId: string,
  whatsappToken: string
) {
  const phone = message.from
  const contactName = contactInfo?.profile?.name || phone

  // Buscar ou criar contato para esta empresa
  let { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone', phone)
    .eq('company_id', companyId)
    .single()

  if (!contact) {
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({ phone, name: contactName, company_id: companyId })
      .select()
      .single()
    contact = newContact
  }

  if (!contact) return

  // Buscar ou criar conversa
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('contact_id', contact.id)
    .eq('company_id', companyId)
    .in('status', ['pending', 'open'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!conversation) {
    // Verificar limite de conversas
    const canCreate = await checkConversationLimit(companyId)
    if (!canCreate) {
      console.warn(`Company ${companyId} reached conversation limit`)
      return
    }

    const { data: newConversation } = await supabase
      .from('conversations')
      .insert({
        contact_id: contact.id,
        company_id: companyId,
        status: 'pending',
        channel: 'whatsapp',
      })
      .select()
      .single()
    conversation = newConversation

    await incrementUsage(companyId, 'conversation')
  }

  if (!conversation) return

  // Extrair conteúdo
  let content: string | null = null
  let mediaUrl: string | null = null
  let mediaMimeType: string | null = null
  let mediaFilename: string | null = null

  switch (message.type) {
    case 'text':
      content = message.text?.body || null
      break
    case 'image':
      content = message.image?.caption || null
      mediaMimeType = message.image?.mime_type || null
      if (message.image?.id) {
        try { mediaUrl = await getMediaUrlWithToken(message.image.id, whatsappToken) } catch {}
      }
      break
    case 'audio':
      mediaMimeType = message.audio?.mime_type || null
      if (message.audio?.id) {
        try { mediaUrl = await getMediaUrlWithToken(message.audio.id, whatsappToken) } catch {}
      }
      break
    case 'video':
      content = message.video?.caption || null
      mediaMimeType = message.video?.mime_type || null
      if (message.video?.id) {
        try { mediaUrl = await getMediaUrlWithToken(message.video.id, whatsappToken) } catch {}
      }
      break
    case 'document':
      mediaMimeType = message.document?.mime_type || null
      mediaFilename = message.document?.filename || null
      if (message.document?.id) {
        try { mediaUrl = await getMediaUrlWithToken(message.document.id, whatsappToken) } catch {}
      }
      break
    case 'sticker':
      mediaMimeType = message.sticker?.mime_type || null
      if (message.sticker?.id) {
        try { mediaUrl = await getMediaUrlWithToken(message.sticker.id, whatsappToken) } catch {}
      }
      break
    case 'location':
      content = JSON.stringify({
        latitude: message.location?.latitude,
        longitude: message.location?.longitude,
        name: message.location?.name,
        address: message.location?.address,
      })
      break
  }

  // Salvar mensagem
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    company_id: companyId,
    whatsapp_message_id: message.id,
    direction: 'inbound',
    type: message.type,
    content,
    media_url: mediaUrl,
    media_mime_type: mediaMimeType,
    media_filename: mediaFilename,
    status: 'delivered',
  })

  // Atualizar conversa
  const lastMessageText = content || `[${message.type}]`
  await supabase
    .from('conversations')
    .update({
      last_message: lastMessageText,
      last_message_at: new Date().toISOString(),
      unread_count: conversation.unread_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.id)

  // Incrementar uso
  await incrementUsage(companyId, 'message_received')

  // Marcar como lida na Meta
  await markMessageAsReadWithToken(message.id, whatsappToken)
}

async function processStatusUpdate(
  supabase: ReturnType<typeof createServiceRoleClient>,
  status: WebhookStatus,
  companyId: string
) {
  const statusMap: Record<string, string> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
  }

  const mappedStatus = statusMap[status.status]
  if (!mappedStatus) return

  await supabase
    .from('messages')
    .update({ status: mappedStatus })
    .eq('whatsapp_message_id', status.id)
    .eq('company_id', companyId)
}

// Funções auxiliares com token específico da empresa
async function getMediaUrlWithToken(mediaId: string, token: string): Promise<string> {
  const response = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Failed to get media URL')
  const data = await response.json()
  return data.url
}

async function markMessageAsReadWithToken(messageId: string, token: string): Promise<void> {
  // Precisamos do phone_number_id, mas não temos aqui diretamente
  // A marcação como lida será feita pelo agente ao abrir a conversa
}
