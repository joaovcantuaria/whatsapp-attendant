import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test-send
 * Endpoint de teste para debugar envio de templates.
 * Mostra o payload exato enviado para a Meta e a resposta completa.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Sem empresa' }, { status: 400 })
    }

    const { data: company } = await serviceClient
      .from('companies')
      .select('whatsapp_token, whatsapp_phone_number_id')
      .eq('id', member.company_id)
      .single()

    if (!company?.whatsapp_token || !company?.whatsapp_phone_number_id) {
      return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 })
    }

    const body = await request.json()
    const { phone, template_name, language } = body

    if (!phone || !template_name) {
      return NextResponse.json({ error: 'phone e template_name obrigatórios' }, { status: 400 })
    }

    // Buscar template
    const { data: templateData } = await serviceClient
      .from('message_templates')
      .select('*')
      .eq('company_id', member.company_id)
      .eq('name', template_name)
      .single()

    // Montar payload
    const components: any[] = []

    // Header - NÃO enviar para imagens estáticas (sample fixo)
    // A Meta usa a imagem do sample automaticamente
    // Só enviar se body.send_header === true (para teste)
    if (templateData?.header_type?.toLowerCase() === 'image' && body.send_header) {
      const imageUrl = body.header_image_url || 'https://edrfxjigpwdoxcybqnbt.supabase.co/storage/v1/object/public/uploads/ca9a769a-281b-428d-afed-b65ffa84e4ab/1784044314175_confirma_es.png'
      components.push({
        type: 'header',
        parameters: [{
          type: 'image',
          image: { link: imageUrl },
        }],
      })
    }

    // Body vars
    const bodyVars = templateData?.body?.match(/\{\{\d+\}\}/g)
    if (bodyVars && bodyVars.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyVars.map((_: string, i: number) => ({
          type: 'text',
          text: `Teste${i + 1}`,
        })),
      })
    }

    const templatePayload: any = {
      name: template_name,
      language: { code: language || templateData?.language || 'pt_BR' },
    }
    if (components.length > 0) {
      templatePayload.components = components
    }

    const messageBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone.replace(/\D/g, ''),
      type: 'template',
      template: templatePayload,
    }

    // Enviar
    const metaResponse = await fetch(
      `https://graph.facebook.com/v22.0/${company.whatsapp_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${company.whatsapp_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageBody),
      }
    )

    const metaData = await metaResponse.json()

    return NextResponse.json({
      status: metaResponse.status,
      ok: metaResponse.ok,
      payload_sent: messageBody,
      meta_response: metaData,
      template_info: templateData ? {
        name: templateData.name,
        status: templateData.status,
        language: templateData.language,
        category: templateData.category,
        header_type: templateData.header_type,
        has_body_vars: bodyVars?.length || 0,
      } : null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
