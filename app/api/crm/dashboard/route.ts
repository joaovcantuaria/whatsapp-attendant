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
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

    const companyId = member.company_id
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Total leads no funil (deals abertos)
    const { count: totalOpenDeals } = await serviceClient
      .from('crm_deals')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'open')

    // Valor total em negociações abertas
    const { data: openDealsValue } = await serviceClient
      .from('crm_deals')
      .select('value')
      .eq('company_id', companyId)
      .eq('status', 'open')

    const totalPipelineValue = openDealsValue?.reduce((sum, d) => sum + (Number(d.value) || 0), 0) || 0

    // Negociações ganhas no mês
    const { data: wonDeals } = await serviceClient
      .from('crm_deals')
      .select('value')
      .eq('company_id', companyId)
      .eq('status', 'won')
      .gte('closed_at', startOfMonth)

    const wonThisMonth = wonDeals?.length || 0
    const wonValue = wonDeals?.reduce((sum, d) => sum + (Number(d.value) || 0), 0) || 0

    // Tarefas pendentes para hoje
    const today = now.toISOString().split('T')[0]
    const { count: tasksDueToday } = await serviceClient
      .from('crm_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .lte('due_date', today)

    // Contatos novos no mês
    const { count: newContactsMonth } = await serviceClient
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', startOfMonth)

    // Taxa de conversão (ganhos / total fechados no mês)
    const { count: totalClosedMonth } = await serviceClient
      .from('crm_deals')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['won', 'lost'])
      .gte('closed_at', startOfMonth)

    const conversionRate = totalClosedMonth && totalClosedMonth > 0
      ? Math.round((wonThisMonth / totalClosedMonth) * 100)
      : 0

    // Negociações perdidas no mês
    const { count: lostThisMonth } = await serviceClient
      .from('crm_deals')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'lost')
      .gte('closed_at', startOfMonth)

    return NextResponse.json({
      totalOpenDeals: totalOpenDeals || 0,
      totalPipelineValue,
      wonThisMonth,
      wonValue,
      lostThisMonth: lostThisMonth || 0,
      tasksDueToday: tasksDueToday || 0,
      newContactsMonth: newContactsMonth || 0,
      conversionRate,
    })
  } catch (error) {
    console.error('CRM Dashboard Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
