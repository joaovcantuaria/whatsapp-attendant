import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Total de conversas hoje
    const { count: totalToday } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO)

    // Conversas abertas
    const { count: openCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')

    // Conversas pendentes
    const { count: pendingCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Conversas fechadas hoje
    const { count: closedToday } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'closed')
      .gte('updated_at', todayISO)

    // Volume de mensagens dos últimos 7 dias
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())

    const messagesLast7Days: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const count = recentMessages?.filter(
        (m) => m.created_at.startsWith(dateStr)
      ).length || 0
      messagesLast7Days.push({ date: dateStr, count })
    }

    // Conversas por agente
    const { data: agentConversations } = await supabase
      .from('conversations')
      .select('agent_id, agents(name)')
      .not('agent_id', 'is', null)
      .eq('status', 'open')

    const agentMap = new Map<string, { agent: string; count: number }>()
    agentConversations?.forEach((conv: any) => {
      const agentData = Array.isArray(conv.agents) ? conv.agents[0] : conv.agents
      const name = agentData?.name || 'Sem nome'
      const existing = agentMap.get(conv.agent_id)
      if (existing) {
        existing.count++
      } else {
        agentMap.set(conv.agent_id, { agent: name, count: 1 })
      }
    })

    // Taxa de resolução (fechadas / total no período)
    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })

    const { count: closedConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'closed')

    const resolutionRate = totalConversations
      ? Math.round(((closedConversations || 0) / totalConversations) * 100)
      : 0

    return NextResponse.json({
      totalConversationsToday: totalToday || 0,
      openConversations: openCount || 0,
      pendingConversations: pendingCount || 0,
      closedConversations: closedToday || 0,
      averageResponseTime: 0, // TODO: implementar cálculo de tempo médio
      messagesLast7Days,
      conversationsByAgent: Array.from(agentMap.values()),
      resolutionRate,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
