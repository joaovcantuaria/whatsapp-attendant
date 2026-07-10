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

    // Total de empresas
    const { count: totalCompanies } = await serviceClient
      .from('companies')
      .select('*', { count: 'exact', head: true })

    // Empresas ativas
    const { count: activeCompanies } = await serviceClient
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('plan_status', 'active')

    // Empresas em trial
    const { count: trialCompanies } = await serviceClient
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('plan_status', 'trial')

    // Receita estimada (empresas ativas * preço do plano)
    const { data: activeWithPlans } = await serviceClient
      .from('companies')
      .select('plans(price_monthly)')
      .eq('plan_status', 'active')

    let estimatedRevenue = 0
    activeWithPlans?.forEach((c: any) => {
      const plan = Array.isArray(c.plans) ? c.plans[0] : c.plans
      if (plan?.price_monthly) estimatedRevenue += Number(plan.price_monthly)
    })

    // Empresas por mês
    const { data: allCompanies } = await serviceClient
      .from('companies')
      .select('created_at')
      .order('created_at', { ascending: true })

    const companiesByMonth: Record<string, number> = {}
    allCompanies?.forEach((c) => {
      const month = c.created_at.slice(0, 7)
      companiesByMonth[month] = (companiesByMonth[month] || 0) + 1
    })

    return NextResponse.json({
      totalCompanies: totalCompanies || 0,
      activeCompanies: activeCompanies || 0,
      trialCompanies: trialCompanies || 0,
      estimatedMonthlyRevenue: estimatedRevenue,
      companiesByMonth: Object.entries(companiesByMonth).map(([month, count]) => ({ month, count })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
