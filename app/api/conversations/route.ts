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

    const status = request.nextUrl.searchParams.get('status')

    // Get user's company_id via company_members (relação correta)
    const serviceClient = createServiceRoleClient()
    const { data: memberData } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    const companyId = memberData?.company_id

    if (!companyId) {
      return NextResponse.json([]) // Sem empresa = sem conversas
    }

    // Use service role to bypass RLS on agent join (get agent.color)
    let query = serviceClient
      .from('conversations')
      .select('*, contact:contacts(*), agent:agents(id, name, color, is_online)')
      .eq('company_id', companyId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(50)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar nova conversa manualmente
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { contact_id, channel } = body

    if (!contact_id) {
      return NextResponse.json({ error: 'contact_id obrigatório' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Buscar company_id via company_members
    const { data: memberData } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!memberData?.company_id) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    // Verificar se já existe conversa aberta com esse contato
    const { data: existing } = await serviceClient
      .from('conversations')
      .select('*, contact:contacts(*), agent:agents(id, name, color)')
      .eq('contact_id', contact_id)
      .eq('company_id', memberData.company_id)
      .in('status', ['pending', 'open'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(existing)
    }

    // Criar nova conversa
    const { data, error } = await serviceClient
      .from('conversations')
      .insert({
        contact_id,
        status: 'open',
        channel: channel || 'whatsapp',
        agent_id: session.user.id,
        company_id: memberData.company_id,
      })
      .select('*, contact:contacts(*), agent:agents(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fetch with service role to bypass RLS on agents join
    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from('conversations')
      .select('*, contact:contacts(*), agent:agents(*)')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
