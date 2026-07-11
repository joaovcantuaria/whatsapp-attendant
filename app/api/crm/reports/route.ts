import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members').select('company_id')
      .eq('user_id', session.user.id).eq('is_active', true).single()
    if (!member) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

    const companyId = member.company_id

    // Top 10 clientes por valor
    const { data: topClients } = await serviceClient
      .from('crm_purchases')
      .select('contact_id, value, contacts:contact_id(name, phone)')
      .eq('company_id', companyId)

    const clientTotals: Record<string, { name: string; phone: string; total: number; count: number }> = {}
    topClients?.forEach((p: any) => {
      if (!clientTotals[p.contact_id]) {
        clientTotals[p.contact_id] = { name: p.contacts?.name || 'Sem nome', phone: p.contacts?.phone || '', total: 0, count: 0 }
      }
      clientTotals[p.contact_id].total += Number(p.value)
      clientTotals[p.contact_id].count += 1
    })

    const topByValue = Object.entries(clientTotals)
      .map(([id, data]) => ({ id, ...data, avgTicket: data.count > 0 ? data.total / data.count : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    const topByFrequency = Object.entries(clientTotals)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Taxa de conversão
    const { count: totalDeals } = await serviceClient
      .from('crm_deals').select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    const { count: wonDeals } = await serviceClient
      .from('crm_deals').select('*', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('status', 'won')

    const conversionRate = totalDeals && totalDeals > 0 ? Math.round(((wonDeals || 0) / totalDeals) * 100) : 0

    // Tempo médio de fechamento (dias)
    const { data: closedDeals } = await serviceClient
      .from('crm_deals')
      .select('created_at, closed_at')
      .eq('company_id', companyId)
      .in('status', ['won', 'lost'])
      .not('closed_at', 'is', null)

    let avgClosingDays = 0
    if (closedDeals && closedDeals.length > 0) {
      const totalDays = closedDeals.reduce((sum, d) => {
        const diff = (new Date(d.closed_at!).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)
        return sum + diff
      }, 0)
      avgClosingDays = Math.round(totalDays / closedDeals.length)
    }

    // Clientes em risco (>30 dias sem interação)
    const { data: allContacts } = await serviceClient
      .from('contacts')
      .select('id, name, phone, updated_at')
      .eq('company_id', companyId)

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const atRiskClients = allContacts?.filter(c =>
      new Date(c.updated_at) < thirtyDaysAgo
    ).slice(0, 20) || []

    // Receita por mês (últimos 6 meses)
    const revenueByMonth: { month: string; value: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString()

      const { data: monthDeals } = await serviceClient
        .from('crm_deals')
        .select('value')
        .eq('company_id', companyId)
        .eq('status', 'won')
        .gte('closed_at', monthStart)
        .lte('closed_at', monthEnd)

      const monthValue = monthDeals?.reduce((sum, d) => sum + Number(d.value), 0) || 0
      revenueByMonth.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        value: monthValue,
      })
    }

    return NextResponse.json({
      topByValue,
      topByFrequency,
      conversionRate,
      avgClosingDays,
      atRiskClients,
      revenueByMonth,
      totalDeals: totalDeals || 0,
      wonDeals: wonDeals || 0,
    })
  } catch (error) {
    console.error('CRM Reports Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
