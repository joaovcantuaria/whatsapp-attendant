import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/external/agendamento
 * 
 * Endpoint para o BoraGerir Empresas enviar notificações de agendamento via WhatsApp.
 * 
 * Headers:
 *   x-api-key: API Key da empresa
 * 
 * Body:
 * {
 *   "phone": "5538999209694",         // Telefone do cliente (com código do país)
 *   "type": "solicitacao" | "confirmacao" | "indisponivel",
 *   "nome": "Marcos",                  // {{1}} - Nome do cliente
 *   "servico": "Limpeza de Pele",      // {{2}} - Serviço solicitado
 *   "data": "25 de Julho de 2026",     // {{3}} - Data
 *   "horario": "13:30",                // {{4}} - Horário
 *   "empresa": "Estética Torres",      // {{5}} - Nome da empresa
 *   "contact_name": "Marcos"           // (opcional) Nome para salvar no contato
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')

    if (!apiKey) {
      return NextResponse.json({
        error: 'API Key obrigatória. Envie no header x-api-key.',
        docs: 'POST /api/external/agendamento com body { phone, type, nome, servico, data, horario, empresa }',
      }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Validar API key
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('id, company_id, is_active, requests_count')
      .eq('key', apiKey)
      .single()

    if (!keyData || !keyData.is_active) {
      return NextResponse.json({ error: 'API Key inválida ou inativa' }, { status: 401 })
    }

    // Atualizar uso
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString(), requests_count: (keyData.requests_count || 0) + 1 })
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
    const { phone, type, nome, servico, data, horario, empresa, contact_name } = body

    // Validações
    if (!phone) {
      return NextResponse.json({ error: 'Campo "phone" é obrigatório' }, { status: 400 })
    }
    if (!type || !['solicitacao', 'confirmacao', 'indisponivel'].includes(type)) {
      return NextResponse.json({
        error: 'Campo "type" é obrigatório. Valores: "solicitacao", "confirmacao", "indisponivel"',
      }, { status: 400 })
    }
    if (!nome || !servico || !data || !horario || !empresa) {
      return NextResponse.json({
        error: 'Campos obrigatórios: nome, servico, data, horario, empresa',
      }, { status: 400 })
    }

    // Mapear tipo para nome do template
    const templateMap: Record<string, string> = {
      solicitacao: 'solicitacao_agendamento',
      confirmacao: 'confirmacao_agendamento',
      indisponivel: 'agendamento_indisponivel',
    }
    const templateName = templateMap[type]

    // Buscar template do banco para pegar o idioma
    const { data: templateInfo } = await supabase
      .from('message_templates')
      .select('language, header_type, header_content')
      .eq('company_id', keyData.company_id)
      .eq('name', templateName)
      .eq('status', 'approved')
      .single()

    const language = templateInfo?.language || 'pt_BR'

    // Montar components
    const components: any[] = []

    // Header de imagem
    // Para templates com imagem estática (sample fixo), NÃO enviar o componente header.
    // A Meta usa automaticamente a imagem do sample cadastrado no template.
    // Comentado: só descomentar se a Meta exigir explicitamente.
    // if (templateInfo?.header_type?.toLowerCase() === 'image') { ... }

    // Body: {{1}}=nome, {{2}}=serviço, {{3}}=data, {{4}}=horário, {{5}}=empresa
    components.push({
      type: 'body',
      parameters: [
        { type: 'text', text: nome },
        { type: 'text', text: servico },
        { type: 'text', text: data },
        { type: 'text', text: horario },
        { type: 'text', text: empresa },
      ],
    })

    // Montar payload completo
    const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0'
    const messageBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone.replace(/\D/g, ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    }

    // Enviar via Meta API
    const metaResponse = await fetch(
      `${WHATSAPP_API_URL}/${company.whatsapp_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${company.whatsapp_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageBody),
      }
    )

    if (!metaResponse.ok) {
      const error = await metaResponse.json()
      return NextResponse.json({
        error: `Meta API [${error.error?.code}]: ${error.error?.message || 'Erro desconhecido'}`,
        details: error.error?.error_data?.details || null,
      }, { status: 500 })
    }

    const metaData = await metaResponse.json()
    const waMessageId = metaData?.messages?.[0]?.id || null

    // Salvar contato + conversa + mensagem no sistema
    const normalizedPhone = phone.replace(/\D/g, '')

    // Buscar ou criar contato
    let { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', normalizedPhone)
      .eq('company_id', keyData.company_id)
      .single()

    if (!contact) {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          phone: normalizedPhone,
          company_id: keyData.company_id,
          name: contact_name || nome || null,
        })
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
          .insert({
            contact_id: contact.id,
            company_id: keyData.company_id,
            status: 'open',
            channel: 'whatsapp',
          })
          .select('id')
          .single()
        conversation = newConv
      }

      if (conversation) {
        // Salvar mensagem
        const typeLabel = type === 'solicitacao' ? 'Solicitação' : type === 'confirmacao' ? 'Confirmação' : 'Indisponível'
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          company_id: keyData.company_id,
          whatsapp_message_id: waMessageId,
          direction: 'outbound',
          type: 'template',
          content: `[${typeLabel}] ${nome} - ${servico} ${data} ${horario}`,
          template_name: templateName,
          status: 'sent',
        })

        // Atualizar conversa
        await supabase
          .from('conversations')
          .update({
            last_message: `[${typeLabel}] ${servico} - ${data} ${horario}`,
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversation.id)
      }
    }

    return NextResponse.json({
      success: true,
      message_id: waMessageId,
      template: templateName,
      phone: normalizedPhone,
      type,
    })
  } catch (error: any) {
    console.error('Agendamento send error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
