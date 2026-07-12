import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// POST - Enviar mensagem via API externa (para integrações)
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key obrigatória. Envie no header x-api-key.' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Validar API key
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('id, company_id, is_active')
      .eq('key', apiKey)
      .single()

    if (!keyData || !keyData.is_active) {
      return NextResponse.json({ error: 'API Key inválida ou inativa' }, { status: 401 })
    }

    // Atualizar uso
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString(), requests_count: (keyData as any).requests_count + 1 })
      .eq('id', keyData.id)

    // Buscar credenciais da empresa
    const { data: company } = await supabase
      .from('companies')
      .select('whatsapp_token, whatsapp_phone_number_id')
      .eq('id', keyData.company_id)
      .single()

    if (!company?.whatsapp_token || !company?.whatsapp_phone_number_id) {
      return NextResponse.json({ error: 'WhatsApp não configurado para esta empresa' }, { status: 400 })
    }

    const body = await request.json()
    const { phone, template, variables, message } = body

    if (!phone) {
      return NextResponse.json({ error: 'Campo "phone" é obrigatório' }, { status: 400 })
    }

    const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0'
    const headers = {
      'Authorization': `Bearer ${company.whatsapp_token}`,
      'Content-Type': 'application/json',
    }

    let messageBody: Record<string, unknown>
    let messageType: string

    // Se tem template, enviar como template
    if (template) {
      const components: any[] = []
      if (variables && variables.length > 0) {
        components.push({
          type: 'body',
          parameters: variables.map((v: string) => ({ type: 'text', text: v })),
        })
      }

      messageBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: template,
          language: { code: body.language || 'pt_BR' },
          components: components.length > 0 ? components : undefined,
        },
      }
      messageType = 'template'
    }
    // Se tem mensagem de texto (só funciona dentro da janela de 24h)
    else if (message) {
      messageBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { body: message },
      }
      messageType = 'text'
    } else {
      return NextResponse.json({ error: 'Envie "template" (com "variables") ou "message" (texto livre)' }, { status: 400 })
    }

    // Enviar via Meta API
    const metaResponse = await fetch(
      `${WHATSAPP_API_URL}/${company.whatsapp_phone_number_id}/messages`,
      { method: 'POST', headers, body: JSON.stringify(messageBody) }
    )

    if (!metaResponse.ok) {
      const error = await metaResponse.json()
      return NextResponse.json({
        error: `Falha ao enviar: ${error.error?.message || 'Erro desconhecido'}`,
        code: error.error?.code,
      }, { status: 500 })
    }

    const metaData = await metaResponse.json()
    const waMessageId = metaData?.messages?.[0]?.id || null

    // Buscar ou criar contato
    let { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', phone)
      .eq('company_id', keyData.company_id)
      .single()

    if (!contact) {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({ phone, company_id: keyData.company_id, name: body.contact_name || null })
        .select('id')
        .single()
      contact = newContact
    }

    // Buscar ou criar conversa
    if (contact) {
      let { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('company_id', keyData.company_id)
        .in('status', ['pending', 'open'])
        .limit(1)
        .single()

      if (!conversation) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ contact_id: contact.id, company_id: keyData.company_id, status: 'open', channel: 'whatsapp' })
          .select('id')
          .single()
        conversation = newConv
      }

      if (conversation) {
        // Salvar mensagem
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          company_id: keyData.company_id,
          whatsapp_message_id: waMessageId,
          direction: 'outbound',
          type: messageType,
          content: message || template || null,
          template_name: template || null,
          status: 'sent',
        })

        // Atualizar conversa
        await supabase
          .from('conversations')
          .update({
            last_message: message || `[template: ${template}]`,
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversation.id)
      }
    }

    return NextResponse.json({
      success: true,
      message_id: waMessageId,
      phone,
      type: messageType,
    })
  } catch (error) {
    console.error('External send error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
