import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const { data: agent } = await serviceClient
      .from('agents')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (!agent?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    const { data: company } = await serviceClient
      .from('companies')
      .select('instagram_access_token, instagram_page_id')
      .eq('id', agent.company_id)
      .single()

    return NextResponse.json({
      instagram_access_token: company?.instagram_access_token ? '***configured***' : null,
      instagram_page_id: company?.instagram_page_id || null,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const serviceClient = createServiceRoleClient()

    const { data: agent } = await serviceClient
      .from('agents')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (!agent?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    const updates: Record<string, any> = {}
    if (body.instagram_access_token) updates.instagram_access_token = body.instagram_access_token
    if (body.instagram_page_id) updates.instagram_page_id = body.instagram_page_id

    const { error } = await serviceClient
      .from('companies')
      .update(updates)
      .eq('id', agent.company_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const { data: agent } = await serviceClient
      .from('agents')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (!agent?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    await serviceClient
      .from('companies')
      .update({ instagram_access_token: null, instagram_page_id: null })
      .eq('id', agent.company_id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
