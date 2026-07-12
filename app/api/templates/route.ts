import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, language, category, header_type, header_content, body: templateBody, footer, buttons, variables } = body

    // Montar components para a Meta API
    const components: Record<string, unknown>[] = []

    if (header_type && header_content) {
      components.push({
        type: 'HEADER',
        format: header_type.toUpperCase(),
        text: header_type === 'text' ? header_content : undefined,
        example: header_type !== 'text' ? { header_handle: [header_content] } : undefined,
      })
    }

    components.push({
      type: 'BODY',
      text: templateBody,
    })

    if (footer) {
      components.push({ type: 'FOOTER', text: footer })
    }

    if (buttons && buttons.length > 0) {
      components.push({ type: 'BUTTONS', buttons })
    }

    // Buscar company_id e credenciais
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
      .select('whatsapp_token, whatsapp_business_account_id')
      .eq('id', member.company_id)
      .single()

    if (!company?.whatsapp_token || !company?.whatsapp_business_account_id) {
      return NextResponse.json({ error: 'WhatsApp não configurado. Configure as credenciais primeiro.' }, { status: 400 })
    }

    // Enviar para aprovação na Meta
    let metaTemplateId: string | null = null
    try {
      const metaUrl = `https://graph.facebook.com/v22.0/${company.whatsapp_business_account_id}/message_templates`
      const metaResponse = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${company.whatsapp_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          language,
          category: category?.toUpperCase() || 'UTILITY',
          components,
        }),
      })

      if (metaResponse.ok) {
        const metaData = await metaResponse.json()
        metaTemplateId = metaData.id || null
      } else {
        const metaError = await metaResponse.json()
        console.error('Meta template error:', metaError)
      }
    } catch (error) {
      console.error('Error creating template on Meta:', error)
    }

    // Salvar no banco
    const { data, error } = await serviceClient
      .from('message_templates')
      .insert({
        company_id: member.company_id,
        name,
        language,
        category,
        header_type: header_type || null,
        header_content: header_content || null,
        body: templateBody,
        footer: footer || null,
        buttons: buttons || null,
        variables: variables || null,
        status: metaTemplateId ? 'pending' : 'draft',
        meta_template_id: metaTemplateId,
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

// Sincronizar templates da Meta
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    // Buscar credenciais da empresa
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
      .select('whatsapp_token, whatsapp_business_account_id, whatsapp_phone_number_id')
      .eq('id', member.company_id)
      .single()

    if (!company?.whatsapp_token) {
      return NextResponse.json({ error: 'WhatsApp não configurado. Vá em Configurações > WhatsApp e conecte sua conta.' }, { status: 400 })
    }

    // Descobrir WABA ID e garantir que o App está vinculado
    let wabaId: string | null = null
    let discoveryLog: string[] = []

    // Estratégia 1: Buscar WABAs via o Business Portfolio (funciona quando App não está subscrito ao WABA)
    try {
      const businessRes = await fetch(
        `https://graph.facebook.com/v22.0/me/whatsapp_business_accounts?fields=id,name`,
        { headers: { 'Authorization': `Bearer ${company.whatsapp_token}` } }
      )
      const businessData = await businessRes.json()
      discoveryLog.push(`Strategy 1 (me/wabas): status=${businessRes.status}`)

      if (businessRes.ok && businessData.data?.length > 0) {
        // Se temos o WABA ID salvo e ele está na lista, usar ele
        if (company.whatsapp_business_account_id) {
          const found = businessData.data.find((w: any) => w.id === company.whatsapp_business_account_id)
          if (found) {
            wabaId = found.id
          }
        }
        // Se não encontrou, usar o primeiro que não é "Test"
        if (!wabaId) {
          const nonTest = businessData.data.find((w: any) => !w.name?.toLowerCase().includes('test'))
          wabaId = nonTest?.id || businessData.data[0].id
        }
        discoveryLog.push(`Found WABA: ${wabaId}`)
      }
    } catch (e: any) {
      discoveryLog.push(`Strategy 1 error: ${e.message}`)
    }

    // Estratégia 2: Tentar acesso direto ao WABA salvo
    if (!wabaId && company.whatsapp_business_account_id) {
      try {
        const testUrl = `https://graph.facebook.com/v22.0/${company.whatsapp_business_account_id}/message_templates?limit=1`
        const testRes = await fetch(testUrl, {
          headers: { 'Authorization': `Bearer ${company.whatsapp_token}` },
        })
        discoveryLog.push(`Strategy 2 (direct): status=${testRes.status}`)
        if (testRes.ok) {
          wabaId = company.whatsapp_business_account_id
        }
      } catch (e: any) {
        discoveryLog.push(`Strategy 2 error: ${e.message}`)
      }
    }

    if (!wabaId) {
      console.error('WABA Discovery failed:', discoveryLog)
      return NextResponse.json({ 
        error: 'Não foi possível encontrar ou acessar a conta WhatsApp Business. Verifique as configurações.' 
      }, { status: 400 })
    }

    // Tentar subscrever o App ao WABA (necessário para acessar diretamente)
    try {
      await fetch(
        `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`,
        { 
          method: 'POST',
          headers: { 'Authorization': `Bearer ${company.whatsapp_token}` } 
        }
      )
    } catch {
      // Não é crítico se falhar
    }

    // Salvar o WABA ID correto
    if (wabaId !== company.whatsapp_business_account_id) {
      await serviceClient
        .from('companies')
        .update({ whatsapp_business_account_id: wabaId })
        .eq('id', member.company_id)
    }

    // Buscar TODOS os templates da Meta (com paginação)
    // Tentar acesso direto primeiro, se falhar tentar via business
    const allTemplates: any[] = []
    let nextUrl: string | null = `https://graph.facebook.com/v22.0/${wabaId}/message_templates?limit=100`

    // Teste rápido se acesso direto funciona
    const quickTest = await fetch(nextUrl, {
      headers: { 'Authorization': `Bearer ${company.whatsapp_token}` },
    })
    
    if (!quickTest.ok) {
      // Acesso direto falha - tentar registrar app e tentar de novo
      discoveryLog.push(`Direct access failed (${quickTest.status}), trying subscribe...`)
      
      // Tentar registrar o phone number
      if (company.whatsapp_phone_number_id) {
        try {
          await fetch(
            `https://graph.facebook.com/v22.0/${company.whatsapp_phone_number_id}/register`,
            { 
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${company.whatsapp_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ messaging_product: 'whatsapp', pin: '000000' })
            }
          )
        } catch {
          // Ignora
        }
      }

      // Tentar de novo após subscribe
      const retryRes = await fetch(nextUrl, {
        headers: { 'Authorization': `Bearer ${company.whatsapp_token}` },
      })
      
      if (!retryRes.ok) {
        const err = await retryRes.json()
        return NextResponse.json({ 
          error: `Não foi possível acessar templates. O App pode não estar vinculado ao WABA. Erro: ${err.error?.message || 'Acesso negado'}. Solução: No Meta Business, vá em Configurações > Apps e vincule o app "BoraGerir Conversas" à conta do WhatsApp.`
        }, { status: 400 })
      }

      // Retry funcionou, processar
      const retryData: { data?: any[]; paging?: { next?: string } } = await retryRes.json()
      if (retryData.data && Array.isArray(retryData.data)) {
        allTemplates.push(...retryData.data)
      }
      nextUrl = retryData.paging?.next || null
    } else {
      // Acesso direto funcionou
      const firstData: { data?: any[]; paging?: { next?: string } } = await quickTest.json()
      if (firstData.data && Array.isArray(firstData.data)) {
        allTemplates.push(...firstData.data)
      }
      nextUrl = firstData.paging?.next || null
    }

    while (nextUrl) {
      const metaResponse: Response = await fetch(nextUrl, {
        headers: { 'Authorization': `Bearer ${company.whatsapp_token}` },
      })

      if (!metaResponse.ok) {
        const err = await metaResponse.json()
        const errorMessage = err.error?.message || 'Erro desconhecido'
        const errorCode = err.error?.code

        // Mensagens mais claras para erros comuns
        if (errorCode === 190) {
          return NextResponse.json({ 
            error: 'Token de acesso inválido ou expirado. Reconecte o WhatsApp nas configurações.' 
          }, { status: 401 })
        }
        if (errorCode === 100) {
          return NextResponse.json({ 
            error: `WABA ID inválido (${wabaId}). Verifique o WhatsApp Business Account ID nas configurações.` 
          }, { status: 400 })
        }
        if (errorCode === 10 || errorCode === 200) {
          return NextResponse.json({ 
            error: 'Permissão negada. O token precisa da permissão whatsapp_business_management.' 
          }, { status: 403 })
        }

        return NextResponse.json({ error: `Meta API: ${errorMessage}` }, { status: 500 })
      }

      const metaData: { data?: any[]; paging?: { next?: string } } = await metaResponse.json()
      
      if (metaData.data && Array.isArray(metaData.data)) {
        allTemplates.push(...metaData.data)
      }

      // Seguir paginação
      nextUrl = metaData.paging?.next || null
    }

    // Processar templates sincronizados
    let syncedCount = 0
    const errors: string[] = []

    for (const template of allTemplates) {
      try {
        // Extrair componentes
        const bodyComponent = template.components?.find((c: { type: string }) => c.type === 'BODY')
        const footerComponent = template.components?.find((c: { type: string }) => c.type === 'FOOTER')
        const headerComponent = template.components?.find((c: { type: string }) => c.type === 'HEADER')
        const buttonsComponent = template.components?.find((c: { type: string }) => c.type === 'BUTTONS')

        // Determinar motivo de rejeição
        let rejectedReason: string | null = null
        if (template.status === 'REJECTED') {
          rejectedReason = template.quality_score?.reasons?.join(', ')
            || template.rejected_reason
            || 'Conteúdo não aprovado pela Meta. Verifique as políticas de templates.'
        }

        // Mapear status da Meta para status local
        const statusMap: Record<string, string> = {
          'APPROVED': 'approved',
          'REJECTED': 'rejected',
          'PENDING': 'pending',
          'IN_APPEAL': 'pending',
          'PENDING_DELETION': 'pending',
          'DELETED': 'deleted',
          'DISABLED': 'disabled',
          'PAUSED': 'paused',
          'LIMIT_EXCEEDED': 'paused',
        }
        const localStatus = statusMap[template.status] || template.status?.toLowerCase() || 'pending'

        // Primeiro, tentar encontrar template existente por meta_template_id
        const { data: existing } = await serviceClient
          .from('message_templates')
          .select('id')
          .eq('company_id', member.company_id)
          .eq('meta_template_id', template.id)
          .maybeSingle()

        const templateData = {
          company_id: member.company_id,
          meta_template_id: template.id,
          name: template.name,
          language: template.language || 'pt_BR',
          category: template.category?.toLowerCase() || null,
          status: localStatus,
          body: bodyComponent?.text || '',
          footer: footerComponent?.text || null,
          header_type: headerComponent?.format?.toLowerCase() || null,
          header_content: headerComponent?.text || headerComponent?.example?.header_handle?.[0] || null,
          buttons: buttonsComponent?.buttons || null,
          rejected_reason: rejectedReason,
          updated_at: new Date().toISOString(),
        }

        if (existing) {
          // Atualizar template existente
          await serviceClient
            .from('message_templates')
            .update(templateData)
            .eq('id', existing.id)
        } else {
          // Verificar se existe por nome (pode ter sido criado como draft)
          const { data: byName } = await serviceClient
            .from('message_templates')
            .select('id')
            .eq('company_id', member.company_id)
            .eq('name', template.name)
            .is('meta_template_id', null)
            .maybeSingle()

          if (byName) {
            // Atualizar draft existente com dados da Meta
            await serviceClient
              .from('message_templates')
              .update(templateData)
              .eq('id', byName.id)
          } else {
            // Inserir novo
            await serviceClient
              .from('message_templates')
              .insert(templateData)
          }
        }

        syncedCount++
      } catch (err: any) {
        console.error(`Error syncing template ${template.name}:`, err)
        errors.push(`${template.name}: ${err.message || 'erro desconhecido'}`)
      }
    }

    // Marcar templates locais que não existem mais na Meta como deletados
    if (allTemplates.length > 0) {
      const metaIds = allTemplates.map((t: any) => t.id).filter(Boolean)
      
      // Buscar templates locais que tem meta_template_id mas não estão mais na Meta
      const { data: localTemplates } = await serviceClient
        .from('message_templates')
        .select('id, meta_template_id')
        .eq('company_id', member.company_id)
        .not('meta_template_id', 'is', null)
        .neq('status', 'deleted')

      if (localTemplates) {
        const toDelete = localTemplates.filter(t => !metaIds.includes(t.meta_template_id))
        if (toDelete.length > 0) {
          await serviceClient
            .from('message_templates')
            .update({ status: 'deleted', updated_at: new Date().toISOString() })
            .in('id', toDelete.map(t => t.id))
        }
      }
    }

    return NextResponse.json({ 
      synced: true, 
      count: syncedCount,
      total_from_meta: allTemplates.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('Sync templates error:', error)
    return NextResponse.json({ 
      error: `Erro interno: ${error.message || 'Verifique o console para detalhes'}` 
    }, { status: 500 })
  }
}


// Deletar template
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Buscar template pra ver se precisa deletar na Meta também
    const { data: template } = await serviceClient
      .from('message_templates')
      .select('meta_template_id, name')
      .eq('id', id)
      .single()

    // Se tem meta_template_id, tentar deletar na Meta
    if (template?.meta_template_id) {
      const { data: member } = await serviceClient
        .from('company_members')
        .select('company_id')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single()

      if (member) {
        const { data: company } = await serviceClient
          .from('companies')
          .select('whatsapp_token, whatsapp_business_account_id')
          .eq('id', member.company_id)
          .single()

        if (company?.whatsapp_token && company?.whatsapp_business_account_id) {
          try {
            await fetch(
              `https://graph.facebook.com/v22.0/${company.whatsapp_business_account_id}/message_templates?name=${template.name}`,
              {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${company.whatsapp_token}` },
              }
            )
          } catch (e) {
            console.error('Error deleting template from Meta:', e)
          }
        }
      }
    }

    // Deletar do banco
    const { error } = await serviceClient
      .from('message_templates')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
