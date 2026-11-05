import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { prepararCampanha, processarLoteCampanha } from '@/lib/campanhas'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

      // Monta a fila e já envia o primeiro lote; o resto sai a cada minuto pelo /api/cron/processar
      const preparo = await prepararCampanha(serviceClient, campaign)
      if (!preparo.ok) return NextResponse.json({ error: preparo.erro }, { status: 400 })

      const lote = await processarLoteCampanha(serviceClient, id, 15, Date.now() + 40_000)
      return NextResponse.json({
        success: true,
        sent: lote.enviadas,
        failed: lote.falhas,
        total: preparo.total,
        em_andamento: !lote.concluida,
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
