import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Webhook verification (GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Receive messages (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createServiceRoleClient()

    // Instagram messaging webhook format
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender?.id
          const recipientId = messaging.recipient?.id
          const timestamp = messaging.timestamp
          const message = messaging.message

          if (!senderId || !message || senderId === recipientId) continue

          // Skip echo messages (sent by us)
          if (message.is_echo) continue

          const content = message.text || ''
          const messageId = message.mid || ''

          // Find company by Instagram page ID
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('instagram_page_id', recipientId)
            .single()

          if (!company) {
            console.log(`[Instagram] Empresa não encontrada para page_id: ${recipientId}`)
            continue
          }

          // Find or create contact
          let { data: contact } = await supabase
            .from('contacts')
            .select('id, name')
            .eq('instagram_id', senderId)
            .eq('company_id', company.id)
            .single()

          if (!contact) {
            // Fetch Instagram user profile
            const accessToken = await getInstagramAccessToken(company.id, supabase)
            let userName = senderId
            
            if (accessToken) {
              try {
                const profileRes = await fetch(
                  `https://graph.instagram.com/v21.0/${senderId}?fields=name,username&access_token=${accessToken}`
                )
                if (profileRes.ok) {
                  const profile = await profileRes.json()
                  userName = profile.name || profile.username || senderId
                }
              } catch {}
            }

            const { data: newContact } = await supabase
              .from('contacts')
              .insert({
                instagram_id: senderId,
                name: userName,
                company_id: company.id,
              })
              .select('id, name')
              .single()
            contact = newContact
          }

          if (!contact) continue

          // Find or create conversation
          let { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('contact_id', contact.id)
            .eq('company_id', company.id)
            .eq('channel', 'instagram')
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
                channel: 'instagram',
                status: 'pending',
                last_message: content,
                last_message_at: new Date(timestamp * 1000).toISOString(),
                unread_count: 1,
              })
              .select('id')
              .single()
            conversation = newConv
          } else {
            // Update existing
            const { data: currentConv } = await supabase
              .from('conversations')
              .select('unread_count')
              .eq('id', conversation.id)
              .single()

            await supabase
              .from('conversations')
              .update({
                last_message: content,
                last_message_at: new Date(timestamp * 1000).toISOString(),
                unread_count: (currentConv?.unread_count || 0) + 1,
              })
              .eq('id', conversation.id)
          }

          if (!conversation) continue

          // Save message
          await supabase.from('messages').insert({
            conversation_id: conversation.id,
            content,
            sender_type: 'contact',
            message_type: message.attachments ? 'media' : 'text',
            external_id: messageId,
            created_at: new Date(timestamp * 1000).toISOString(),
          })

          console.log(`[Instagram] ✅ Mensagem de ${contact.name}: ${content.substring(0, 30)}`)
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[Instagram] Webhook error:', error)
    return NextResponse.json({ status: 'ok' }) // Always return 200 to Meta
  }
}

async function getInstagramAccessToken(companyId: string, supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from('companies')
    .select('instagram_access_token')
    .eq('id', companyId)
    .single()
  return data?.instagram_access_token || null
}
