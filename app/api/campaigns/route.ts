import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

async function getUserCompanyId(userId: string) {
  const serviceClient = createServiceRoleClient()
  const { data } = await serviceClient
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  return data?.company_id || null
}

// GET - Listar campanhas
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from('campaigns')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar campanha
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, template_name, template_language, template_vars_mapping, header_media_url, scheduled_at, contact_ids } = body

    if (!name || !template_name || !contact_ids || contact_ids.length === 0) {
      return NextResponse.json({ error: 'Nome, template e contatos são obrigatórios' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { data, error } = await serviceClient
      .from('campaigns')
      .insert({
        company_id: companyId,
        name,
        description: description || null,
        template_name,
        template_language: template_language || 'pt_BR',
        template_components: {
          vars_mapping: template_vars_mapping || null,
          header_media_url: header_media_url || null,
        },
        status: scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: scheduled_at || null,
        total_contacts: contact_ids.length,
        contact_ids,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - Atualizar status / Executar campanha
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    const body = await request.json()
    const { id, action } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'ID e ação são obrigatórios' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Buscar campanha
    const { data: campaign } = await serviceClient
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    if (action === 'cancel') {
      await serviceClient
        .from('campaigns')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
      return NextResponse.json({ success: true })
    }

    if (action === 'send') {
      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        return NextResponse.json({ error: 'Campanha não pode ser enviada neste status' }, { status: 400 })
      }

      // Verificar se o template existe e está aprovado
      const { data: templateCheck } = await serviceClient
        .from('message_templates')
        .select('id, name, status, header_type')
        .eq('company_id', companyId)
        .eq('name', campaign.template_name)
        .single()

      if (!templateCheck) {
        return NextResponse.json({
          error: `Template "${campaign.template_name}" não encontrado. Sincronize os templates com a Meta.`,
        }, { status: 400 })
      }

      if (templateCheck.status !== 'approved') {
        return NextResponse.json({
          error: `Template "${campaign.template_name}" não está aprovado (status: ${templateCheck.status}). Apenas templates aprovados pela Meta podem ser enviados.`,
        }, { status: 400 })
      }

      // Buscar credenciais da empresa
      const { data: company } = await serviceClient
        .from('companies')
        .select('whatsapp_token, whatsapp_phone_number_id')
        .eq('id', companyId)
        .single()

      if (!company?.whatsapp_token || !company?.whatsapp_phone_number_id) {
        return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 })
      }

      // Buscar contatos
      const { data: contacts } = await serviceClient
        .from('contacts')
        .select('id, phone, name')
        .in('id', campaign.contact_ids)

      if (!contacts || contacts.length === 0) {
        return NextResponse.json({ error: 'Nenhum contato encontrado' }, { status: 400 })
      }

      // Montar components - resolver por contato se tem vars_mapping
      let varsMapping: Record<string, string> | null = null
      if (campaign.template_components?.vars_mapping) {
        varsMapping = campaign.template_components.vars_mapping
      }
      const savedHeaderMediaUrl: string | null = campaign.template_components?.header_media_url || null

      // Buscar template para verificar se tem variáveis obrigatórias
      const { data: templateData } = await serviceClient
        .from('message_templates')
        .select('body, header_type, header_content')
        .eq('company_id', companyId)
        .eq('name', campaign.template_name)
        .single()

      const templateBodyVars = templateData?.body?.match(/\{\{\d+\}\}/g)
      const hasRequiredVars = templateBodyVars && templateBodyVars.length > 0
      const hasMediaHeader = templateData?.header_type &&
        ['image', 'video', 'document'].includes(templateData.header_type.toLowerCase())

      // Se o template exige variáveis mas não temos mapeamento, usar fallback automático
      // (nome do contato para {{1}}, traço para o resto)

      // Marcar como em execução
      await serviceClient
        .from('campaigns')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          total_contacts: contacts.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      // Enviar para cada contato
      const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0'
      const headers = {
        'Authorization': `Bearer ${company.whatsapp_token}`,
        'Content-Type': 'application/json',
      }

      let sentCount = 0
      let failedCount = 0

      for (const contact of contacts) {
        try {
          // Normalizar telefone para formato E.164 (só dígitos)
          const phone = contact.phone.replace(/\D/g, '')
          if (!phone || phone.length < 10) {
            await serviceClient.from('campaign_messages').insert({
              campaign_id: id,
              contact_id: contact.id,
              phone: contact.phone,
              status: 'failed',
              error_message: `Telefone inválido: "${contact.phone}" (${phone.length} dígitos)`,
            })
            failedCount++
            continue
          }

          // Montar payload do template
          const templatePayload: any = {
            name: campaign.template_name,
            language: { code: campaign.template_language || 'pt_BR' },
          }

          // Montar components com variáveis resolvidas por contato
          const components: any[] = []

          // Header de mídia - OBRIGATÓRIO se template tem header dinâmico
          if (hasMediaHeader) {
            // Usar URL salva na campanha, ou do template se for válida
            const headerUrl = savedHeaderMediaUrl ||
              (templateData?.header_content?.startsWith('http') ? templateData.header_content : null)

            if (headerUrl) {
              const mediaType = templateData!.header_type!.toLowerCase()
              const mediaParam: any = { type: mediaType }
              mediaParam[mediaType] = { link: headerUrl }
              components.push({ type: 'header', parameters: [mediaParam] })
            }
          }

          // Body com variáveis resolvidas por contato
          if (hasRequiredVars) {
            const bodyParams: any[] = []
            const expectedCount = templateBodyVars!.length

            for (let i = 1; i <= expectedCount; i++) {
              const key = `{{${i}}}`
              const mapping = varsMapping ? varsMapping[key] || '' : ''
              let value = ''

              if (mapping === '{{contact_name}}') {
                value = contact.name || phone
              } else if (mapping === '{{contact_phone}}') {
                value = contact.phone
              } else if (mapping === '__custom__') {
                value = (varsMapping ? varsMapping[`${key}_custom`] : '') || '-'
              } else if (mapping) {
                value = mapping
              } else {
                // Fallback automático: nome para {{1}}, traço para o resto
                value = i === 1 ? (contact.name || phone) : '-'
              }

              bodyParams.push({ type: 'text', text: value })
            }

            components.push({ type: 'body', parameters: bodyParams })
          }

          if (components.length > 0) {
            templatePayload.components = components
          }

          const messageBody = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'template',
            template: templatePayload,
          }

          const metaResponse = await fetch(
            `${WHATSAPP_API_URL}/${company.whatsapp_phone_number_id}/messages`,
            { method: 'POST', headers, body: JSON.stringify(messageBody) }
          )

          const metaData = await metaResponse.json()

          if (metaResponse.ok) {
            const waMessageId = metaData?.messages?.[0]?.id || null

            await serviceClient.from('campaign_messages').insert({
              campaign_id: id,
              contact_id: contact.id,
              phone: contact.phone,
              whatsapp_message_id: waMessageId,
              status: 'sent',
              sent_at: new Date().toISOString(),
            })

            sentCount++
          } else {
            // Log detalhado do erro
            const errorDetail = metaData?.error
              ? `[${metaData.error.code || '?'}] ${metaData.error.message || 'Sem detalhes'} | Template: ${campaign.template_name} | Phone: ${contact.phone}`
              : 'Erro desconhecido'

            await serviceClient.from('campaign_messages').insert({
              campaign_id: id,
              contact_id: contact.id,
              phone: contact.phone,
              status: 'failed',
              error_message: errorDetail,
            })
            failedCount++
          }

          // Delay entre envios (para evitar rate limit da Meta)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (err: any) {
          await serviceClient.from('campaign_messages').insert({
            campaign_id: id,
            contact_id: contact.id,
            phone: contact.phone,
            status: 'failed',
            error_message: `Erro de conexão: ${err?.message || 'desconhecido'}`,
          })
          failedCount++
        }
      }

      // Atualizar campanha como concluída
      await serviceClient
        .from('campaigns')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          sent_count: sentCount,
          failed_count: failedCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      return NextResponse.json({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: contacts.length,
      })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    console.error('Campaign execution error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Excluir campanha
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
