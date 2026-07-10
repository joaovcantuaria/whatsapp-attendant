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

    const { data: companies } = await serviceClient
      .from('companies')
      .select('*, plan:plans(name, slug)')
      .order('created_at', { ascending: false })

    // Para cada empresa, contar membros e conversas do mês
    const currentMonth = new Date().toISOString().slice(0, 7)
    const enriched = await Promise.all(
      (companies || []).map(async (company) => {
        const { count: membersCount } = await serviceClient
          .from('company_members')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('is_active', true)

        const { data: usage } = await serviceClient
          .from('usage_logs')
          .select('conversations_count, messages_sent')
          .eq('company_id', company.id)
          .eq('month', currentMonth)
          .single()

        return {
          ...company,
          members_count: membersCount || 0,
          conversations_this_month: usage?.conversations_count || 0,
          messages_this_month: usage?.messages_sent || 0,
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - Atualizar empresa (super admin)
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
      .from('companies')
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
