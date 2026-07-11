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
    if (!member) return NextResponse.json([])

    const companyId = member.company_id
    const alerts: { id: string; type: string; title: string; description: string; severity: string; contact_id?: string; deal_id?: string }[] = []

    // 1. Clientes sem interação há mais de 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: inactiveContacts } = await serviceClient
      .from('contacts')
      .select('id, name, phone, updated_at')
      .eq('company_id', companyId)
      .lt('updated_at', thirtyDaysAgo)
      .limit(10)

    inactiveContacts?.forEach(c => {
      const days = Math.floor((Date.now() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24))
      alerts.push({
        id: `inactive_${c.id}`,
        type: 'inactive_client',
        title: `${c.name || c.phone} sem interação`,
        description: `Há ${days} dias sem contato`,
        severity: days > 60 ? 'high' : 'medium',
        contact_id: c.id,
      })
    })

    // 2. Negociações paradas há mais de 7 dias
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: staleDeals } = await serviceClient
      .from('crm_deals')
      .select('id, title, updated_at, contact:contacts(name)')
      .eq('company_id', companyId)
      .eq('status', 'open')
      .lt('updated_at', sevenDaysAgo)
      .limit(10)

    staleDeals?.forEach((d: any) => {
      const days = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24))
      alerts.push({
        id: `stale_${d.id}`,
        type: 'stale_deal',
        title: `"${d.title}" parada`,
        description: `Sem movimentação há ${days} dias`,
        severity: days > 14 ? 'high' : 'medium',
        deal_id: d.id,
      })
    })

    // 3. Aniversários hoje/próximos 7 dias
    const today = new Date()
    const { data: contacts } = await serviceClient
      .from('contacts')
      .select('id, name, phone, birthday')
      .eq('company_id', companyId)
      .not('birthday', 'is', null)

    contacts?.forEach(c => {
      if (!c.birthday) return
      const bday = new Date(c.birthday + 'T00:00:00')
      const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
      const diffDays = Math.floor((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        alerts.push({
          id: `bday_${c.id}`,
          type: 'birthday',
          title: `🎂 Aniversário de ${c.name || c.phone}`,
          description: 'Hoje é o aniversário!',
          severity: 'low',
          contact_id: c.id,
        })
      } else if (diffDays > 0 && diffDays <= 7) {
        alerts.push({
          id: `bday_soon_${c.id}`,
          type: 'birthday',
          title: `🎂 ${c.name || c.phone} faz aniversário em breve`,
          description: `Em ${diffDays} dia${diffDays > 1 ? 's' : ''}`,
          severity: 'low',
          contact_id: c.id,
        })
      }
    })

    // 4. Tarefas atrasadas
    const todayStr = today.toISOString().split('T')[0]
    const { data: overdueTasks } = await serviceClient
      .from('crm_tasks')
      .select('id, title, due_date, contact:contacts(name)')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .lt('due_date', todayStr)
      .limit(10)

    overdueTasks?.forEach((t: any) => {
      const days = Math.floor((today.getTime() - new Date(t.due_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
      alerts.push({
        id: `task_${t.id}`,
        type: 'overdue_task',
        title: `Tarefa atrasada: ${t.title}`,
        description: `${days} dia${days > 1 ? 's' : ''} de atraso${t.contact?.name ? ` • ${t.contact.name}` : ''}`,
        severity: 'high',
      })
    })

    // Ordenar por severidade
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('CRM Alerts Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
