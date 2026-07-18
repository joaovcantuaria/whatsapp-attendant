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

    // Total de agentes (clientes)
    const { count: totalAgents } = await serviceClient
      .from('agents')
      .select('*', { count: 'exact', head: true })

    // Agentes online
    const { count: onlineAgents } = await serviceClient
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true)

    // Total de conversas
    const { count: totalConversations } = await serviceClient
      .from('conversations')
      .select('*', { count: 'exact', head: true })

    // Mensagens hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: messagesToday } = await serviceClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

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

    // Empresas criadas por mês (últimos 6 meses)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const { data: recentCompanies } = await serviceClient
      .from('companies')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: true })

    const companiesByMonth: Record<string, number> = {}
    recentCompanies?.forEach((c) => {
      const month = c.created_at.slice(0, 7)
      companiesByMonth[month] = (companiesByMonth[month] || 0) + 1
    })

    // Atividade recente (últimos 20 agentes cadastrados)
    const { data: recentAgents } = await serviceClient
      .from('agents')
      .select('id, name, email, created_at, is_online, companies(name)')
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      totalCompanies: totalCompanies || 0,
      activeCompanies: activeCompanies || 0,
      trialCompanies: trialCompanies || 0,
      totalAgents: totalAgents || 0,
      onlineAgents: onlineAgents || 0,
      totalConversations: totalConversations || 0,
      messagesToday: messagesToday || 0,
      estimatedMonthlyRevenue: estimatedRevenue,
      companiesByMonth: Object.entries(companiesByMonth).map(([month, count]) => ({ month, count })),
      recentAgents: recentAgents || [],
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
