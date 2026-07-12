import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { createTemplate, getTemplates } from '@/lib/meta'

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
      return NextResponse.json({ error: 'Sem empresa' }, { status: 400 })
    }

    const { data: company } = await serviceClient
      .from('companies')
      .select('whatsapp_token, whatsapp_business_account_id, whatsapp_phone_number_id')
      .eq('id', member.company_id)
      .single()

    if (!company?.whatsapp_token) {
      return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 })
    }

    // Descobrir WABA ID a partir do phone_number_id (mais confiável)
    let wabaId = company.whatsapp_business_account_id

    if (company.whatsapp_phone_number_id) {
      try {
        const wabaRes = await fetch(
          `https://graph.facebook.com/v22.0/${company.whatsapp_phone_number_id}?fields=id,display_phone_number,name_status,verified_name`,
          { headers: { 'Authorization': `Bearer ${company.whatsapp_token}` } }
        )
        if (wabaRes.ok) {
          // Tentar buscar o WABA via outra rota
          const phoneData = await wabaRes.json()
          // Buscar WABA ID usando o phone number
          const wabaLookup = await fetch(
            `https://graph.facebook.com/v22.0/${company.whatsapp_phone_number_id}/whatsapp_business_account`,
            { headers: { 'Authorization': `Bearer ${company.whatsapp_token}` } }
          )
          if (wabaLookup.ok) {
            const wabaData = await wabaLookup.json()
            if (wabaData.id) {
              wabaId = wabaData.id
              // Salvar o WABA ID correto no banco pra próxima vez
              await serviceClient.from('companies').update({ whatsapp_business_account_id: wabaId }).eq('id', member.company_id)
            }
          }
        }
      } catch (e) {
        console.error('Error discovering WABA ID:', e)
      }
    }

    if (!wabaId) {
      return NextResponse.json({ error: 'WABA ID não encontrado. Configure o WhatsApp Business Account ID.' }, { status: 400 })
    }

    // Buscar templates da Meta
    const metaUrl = `https://graph.facebook.com/v22.0/${wabaId}/message_templates`
    const metaResponse = await fetch(metaUrl, {
      headers: { 'Authorization': `Bearer ${company.whatsapp_token}` },
    })

    if (!metaResponse.ok) {
      const err = await metaResponse.json()
      return NextResponse.json({ error: `Meta API: ${err.error?.message || 'Erro'}` }, { status: 500 })
    }

    const metaTemplates = await metaResponse.json()
    
    if (metaTemplates.data) {
      for (const template of metaTemplates.data) {
        // Extrair motivo de rejeição se existir
        const rejectedReason = template.quality_score?.reasons?.join(', ') 
          || template.rejected_reason 
          || template.status === 'REJECTED' ? (template.quality_score?.reasons?.[0] || 'Verificação da empresa pendente ou conteúdo não aprovado') : null

        await serviceClient
          .from('message_templates')
          .upsert({
            company_id: member.company_id,
            meta_template_id: template.id,
            name: template.name,
            language: template.language,
            category: template.category?.toLowerCase(),
            status: template.status?.toLowerCase() === 'approved' ? 'approved' : template.status?.toLowerCase(),
            body: template.components?.find((c: { type: string }) => c.type === 'BODY')?.text || '',
            footer: template.components?.find((c: { type: string }) => c.type === 'FOOTER')?.text || null,
            rejected_reason: template.status === 'REJECTED' ? (rejectedReason || 'Motivo não especificado pela Meta. Verifique se a empresa está verificada.') : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'meta_template_id' })
      }
    }

    return NextResponse.json({ synced: true, count: metaTemplates.data?.length || 0 })
  } catch (error) {
    console.error('Sync templates error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
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
