import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { incrementUsage } from '@/lib/plan-limits'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      conversationId,
      phone,
      type,
      content,
      mediaUrl,
      mediaFilename,
      templateName,
      templateLanguage,
      templateComponents,
    } = body

    // Buscar company_id do membro e credenciais da empresa
    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    const { data: company } = await serviceClient
      .from('companies')
      .select('whatsapp_token, whatsapp_phone_number_id')
      .eq('id', member.company_id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 })
    }

    // Determinar modo de envio: QR Code (Baileys) ou API Cloud (Meta)
    // Se não tem whatsapp_token, significa que usa QR Code via Baileys
    const useBaileys = !company.whatsapp_token || !company.whatsapp_phone_number_id

    let whatsappMessageId: string | null = null

    if (useBaileys) {
      // ========== ENVIO VIA BAILEYS (QR Code) ==========
      const WHATSAPP_SERVER_URL = 'http://169.58.36.33:3001'
      const API_KEY = 'boragerir-whatsapp-server-2026'

      if (type === 'template') {
        return NextResponse.json({ error: 'Templates não suportados via QR Code. Use a API oficial.' }, { status: 400 })
      }

      if (type === 'text') {
        if (!content) return NextResponse.json({ error: 'Conteúdo obrigatório' }, { status: 400 })

        const baileyRes = await fetch(`${WHATSAPP_SERVER_URL}/api/message/send-text`, {
          method: 'POST',
          headers: {
            'x-api-key': API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instanceId: member.company_id,
            phone,
            message: content,
            skipSave: true,
          }),
        })

        if (!baileyRes.ok) {
          const errData = await baileyRes.json().catch(() => ({}))
          return NextResponse.json({
            error: errData.error || 'Erro ao enviar via WhatsApp (QR Code)',
          }, { status: 500 })
        }

        // Capturar messageId real do Baileys
        const baileyData = await baileyRes.json().catch(() => ({}))
        if (baileyData.messageId) {
          whatsappMessageId = baileyData.messageId
        }
      } else if (['image', 'document', 'audio', 'video'].includes(type)) {
        const baileyRes = await fetch(`${WHATSAPP_SERVER_URL}/api/message/send-media`, {
          method: 'POST',
          headers: {
            'x-api-key': API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instanceId: member.company_id,
            phone,
            mediaUrl,
            caption: content || mediaFilename,
            type,
          }),
        })

        if (!baileyRes.ok) {
          const errData = await baileyRes.json().catch(() => ({}))
          return NextResponse.json({
            error: errData.error || 'Erro ao enviar mídia via WhatsApp (QR Code)',
          }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: 'Tipo não suportado via QR Code' }, { status: 400 })
      }

      whatsappMessageId = `baileys_${Date.now()}`

    } else {
      // ========== ENVIO VIA META CLOUD API (Oficial) ==========
      if (!company.whatsapp_token || !company.whatsapp_phone_number_id) {
        return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 })
      }

      const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0'
      const headers = {
        'Authorization': `Bearer ${company.whatsapp_token}`,
        'Content-Type': 'application/json',
      }

      let messageBody: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
      }

      // Montar payload baseado no tipo
      switch (type) {
        case 'text':
          if (!content) return NextResponse.json({ error: 'Conteúdo obrigatório' }, { status: 400 })
          messageBody = { ...messageBody, type: 'text', text: { preview_url: true, body: content } }
          break
        case 'image':
          messageBody = { ...messageBody, type: 'image', image: { link: mediaUrl, caption: content } }
          break
        case 'document':
          messageBody = { ...messageBody, type: 'document', document: { link: mediaUrl, filename: mediaFilename } }
          break
        case 'audio':
          messageBody = { ...messageBody, type: 'audio', audio: { link: mediaUrl } }
          break
        case 'template':
          if (!templateName || !templateLanguage) {
            return NextResponse.json({ error: 'Template name e language obrigatórios' }, { status: 400 })
          }
          const templatePayload: any = { name: templateName, language: { code: templateLanguage } }
          if (templateComponents && Array.isArray(templateComponents) && templateComponents.length > 0) {
            templatePayload.components = templateComponents
          }
          messageBody = {
            ...messageBody,
            type: 'template',
            template: templatePayload,
          }
          break
        default:
          return NextResponse.json({ error: 'Tipo não suportado' }, { status: 400 })
      }

      // Enviar via Meta API
      const metaResponse = await fetch(
        `${WHATSAPP_API_URL}/${company.whatsapp_phone_number_id}/messages`,
        { method: 'POST', headers, body: JSON.stringify(messageBody) }
      )

      if (!metaResponse.ok) {
        const errorData = await metaResponse.json()
        const errorCode = errorData.error?.code || '?'
        const errorMsg = errorData.error?.message || 'Erro desconhecido'
        const errorDetails = errorData.error?.error_data?.details || ''
        return NextResponse.json({
          error: `Meta API [${errorCode}]: ${errorMsg}${errorDetails ? ` - ${errorDetails}` : ''}`,
        }, { status: 500 })
      }

      const metaData = await metaResponse.json()
      whatsappMessageId = metaData?.messages?.[0]?.id || null
    }

    // Salvar mensagem no banco com company_id
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        company_id: member.company_id,
        whatsapp_message_id: whatsappMessageId,
        direction: 'outbound',
        type,
        content,
        media_url: mediaUrl || null,
        media_filename: mediaFilename || null,
        template_name: templateName || null,
        status: 'sent',
        agent_id: session.user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Erro ao salvar mensagem' }, { status: 500 })
    }

    // Atualizar conversa
    const lastMessageText = content || templateName || `[${type}]`
    await supabase
      .from('conversations')
      .update({
        last_message: lastMessageText,
        last_message_at: new Date().toISOString(),
        status: 'open',
        agent_id: session.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    // Incrementar uso
    await incrementUsage(member.company_id, 'message_sent')

    return NextResponse.json(message)
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
