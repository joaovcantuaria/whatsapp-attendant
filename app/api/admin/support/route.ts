import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()

    const { data, error } = await serviceClient
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich with company names
    const companyIds = Array.from(new Set((data || []).map(t => t.company_id).filter(Boolean)))
    let companiesMap: Record<string, string> = {}
    if (companyIds.length > 0) {
      const { data: companies } = await serviceClient
        .from('companies')
        .select('id, name')
        .in('id', companyIds)
      companiesMap = (companies || []).reduce((acc, c) => {
        acc[c.id] = c.name
        return acc
      }, {} as Record<string, string>)
    }

    const enriched = (data || []).map(ticket => ({
      ...ticket,
      companies: ticket.company_id ? { name: companiesMap[ticket.company_id] || '—' } : null
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()
    const body = await request.json()

    const { data, error } = await serviceClient
      .from('support_tickets')
      .insert({
        subject: body.subject,
        description: body.description,
        company_id: body.company_id,
        priority: body.priority || 'medium',
        status: 'open',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()
    const body = await request.json()
    const { id, ...updates } = body

    const { data, error } = await serviceClient
      .from('support_tickets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    const { error } = await serviceClient
      .from('support_tickets')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
