import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createTemplate, getTemplates } from '@/lib/meta'

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

    // Enviar para aprovação na Meta
    let metaTemplateId: string | null = null
    try {
      const metaResponse = await createTemplate({
        name,
        language,
        category: category?.toUpperCase() || 'UTILITY',
        components,
      })
      metaTemplateId = metaResponse.id || null
    } catch (error) {
      console.error('Error creating template on Meta:', error)
      // Salvar mesmo se falhar na Meta (para edição posterior)
    }

    // Salvar no banco
    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        name,
        language,
        category,
        header_type,
        header_content,
        body: templateBody,
        footer,
        buttons,
        variables,
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

    const metaTemplates = await getTemplates()
    
    if (metaTemplates.data) {
      for (const template of metaTemplates.data) {
        await supabase
          .from('message_templates')
          .upsert({
            meta_template_id: template.id,
            name: template.name,
            language: template.language,
            category: template.category?.toLowerCase(),
            status: template.status?.toLowerCase() === 'approved' ? 'approved' : template.status?.toLowerCase(),
            body: template.components?.find((c: { type: string }) => c.type === 'BODY')?.text || '',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'meta_template_id' })
      }
    }

    return NextResponse.json({ synced: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
