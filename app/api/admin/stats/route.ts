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
    const { data: activeComps } = await serviceClient
      .from('companies')
      .select('plan_id')
      .eq('plan_status', 'active')

    let estimatedRevenue = 0
    if (activeComps && activeComps.length > 0) {
      const planIds = [...new Set(activeComps.map(c => c.plan_id).filter(Boolean))]
      if (planIds.length > 0) {
        const { data: plans } = await serviceClient
          .from('plans')
          .select('id, price_monthly')
          .in('id', planIds)

        const planPrices: Record<string, number> = {}
        plans?.forEach(p => { planPrices[p.id] = p.price_monthly || 0 })
        activeComps.forEach(c => {
          if (c.plan_id && planPrices[c.plan_id]) {
            estimatedRevenue += planPrices[c.plan_id]
          }
        })
      }
    }

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
      .select('id, name, email, created_at, is_online, company_id')
      .order('created_at', { ascending: false })
      .limit(20)

    // Enrich with company names
    const agentCompanyIds = [...new Set((recentAgents || []).map(a => a.company_id).filter(Boolean))]
    let agentCompaniesMap: Record<string, string> = {}
    if (agentCompanyIds.length > 0) {
      const { data: agentCompanies } = await serviceClient
        .from('companies')
        .select('id, name')
        .in('id', agentCompanyIds)
      agentCompaniesMap = (agentCompanies || []).reduce((acc, c) => {
        acc[c.id] = c.name
        return acc
      }, {} as Record<string, string>)
    }

    const enrichedAgents = (recentAgents || []).map(a => ({
      ...a,
      companies: a.company_id ? { name: agentCompaniesMap[a.company_id] || '—' } : null
    }))

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
      recentAgents: enrichedAgents,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
