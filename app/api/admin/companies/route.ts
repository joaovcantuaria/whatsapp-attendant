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

    const { data: companies, error } = await serviceClient
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich with plan info and member count
    const planIds = Array.from(new Set((companies || []).map(c => c.plan_id).filter(Boolean)))
    let plansMap: Record<string, any> = {}
    if (planIds.length > 0) {
      const { data: plans } = await serviceClient
        .from('plans')
        .select('id, name, slug, price_monthly')
        .in('id', planIds)
      plansMap = (plans || []).reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {} as Record<string, any>)
    }

    // Enriquecer com contagem de membros
    const enriched = await Promise.all(
      (companies || []).map(async (company) => {
        const { count: membersCount } = await serviceClient
          .from('company_members')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('is_active', true)

        return {
          ...company,
          plans: company.plan_id ? plansMap[company.plan_id] || null : null,
          members_count: membersCount || 0,
        }
      })
    )

    return NextResponse.json(enriched)
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
