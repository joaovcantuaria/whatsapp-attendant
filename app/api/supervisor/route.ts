import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function getPeriodStart(period: string): Date {
  const now = new Date()
  switch (period) {
    case 'week': {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1 // Monday = 0
      const monday = new Date(now)
      monday.setDate(now.getDate() - diff)
      monday.setHours(0, 0, 0, 0)
      return monday
    }
    case 'month': {
      return new Date(now.getFullYear(), now.getMonth(), 1)
    }
    default: { // today
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      return today
    }
  }
}

function getDaysInPeriod(periodStart: Date): number {
  const now = new Date()
  const diffMs = now.getTime() - periodStart.getTime()
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(days, 1)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    // Verificar role do usuário
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (member.role !== 'owner' && member.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const period = request.nextUrl.searchParams.get('period') || 'today'
    const periodStart = getPeriodStart(period)
    const daysInPeriod = getDaysInPeriod(periodStart)

    // Buscar agentes da empresa
    const { data: members } = await serviceClient
      .from('company_members')
      .select('user_id')
      .eq('company_id', member.company_id)
      .eq('is_active', true)

    const userIds = members?.map(m => m.user_id) || []

    const { data: agents } = await serviceClient
      .from('agents')
      .select('id, name, avatar_url, is_online')
      .in('id', userIds.length > 0 ? userIds : ['none'])

    if (!agents || agents.length === 0) {
      return NextResponse.json({
        agents: [],
        period,
        periodStart: periodStart.toISOString(),
        periodEnd: new Date().toISOString(),
        totalOnline: 0,
        totalOffline: 0,
      })
    }

    // Buscar conversas no período
    const { data: conversations } = await serviceClient
      .from('conversations')
      .select('id, agent_id, status, created_at')
      .eq('company_id', member.company_id)
      .gte('created_at', periodStart.toISOString())

    // Buscar mensagens pra calcular tempo de resposta
    const conversationIds = conversations?.map(c => c.id) || []
    let messages: any[] = []
    if (conversationIds.length > 0) {
      const { data: msgs } = await serviceClient
        .from('messages')
        .select('conversation_id, direction, agent_id, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true })
      messages = msgs || []
    }

    // Calcular métricas por agente
    const agentMetrics = agents.map((agent) => {
      const agentConversations = conversations?.filter(c => c.agent_id === agent.id) || []
      const totalConversations = agentConversations.length
      const closedConversations = agentConversations.filter(c => c.status === 'closed').length

      // Média diária
      const avgDailyConversations = totalConversations / daysInPeriod

      // Taxa de resolução
      const resolutionRate = totalConversations > 0
        ? Math.round((closedConversations / totalConversations) * 100)
        : 0

      // Tempo médio de resposta
      let avgResponseTimeMinutes: number | null = null
      const responseTimes: number[] = []

      for (const conv of agentConversations) {
        const convMessages = messages.filter(m => m.conversation_id === conv.id)
        // Encontrar primeiro inbound e primeiro outbound depois dele
        const firstInbound = convMessages.find(m => m.direction === 'inbound')
        if (!firstInbound) continue

        const firstOutbound = convMessages.find(
          m => m.direction === 'outbound' && new Date(m.created_at) > new Date(firstInbound.created_at)
        )
        if (!firstOutbound) continue

        const diffMs = new Date(firstOutbound.created_at).getTime() - new Date(firstInbound.created_at).getTime()
        responseTimes.push(diffMs / (1000 * 60)) // em minutos
      }

      if (responseTimes.length > 0) {
        avgResponseTimeMinutes = Math.round(
          responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        )
      }

      return {
        agentId: agent.id,
        agentName: agent.name,
        avatarUrl: agent.avatar_url,
        isOnline: agent.is_online,
        totalConversations,
        avgDailyConversations: Math.round(avgDailyConversations * 10) / 10,
        avgResponseTimeMinutes,
        resolutionRate,
      }
    })

    // Ordenar por total de conversas (desc)
    agentMetrics.sort((a, b) => b.totalConversations - a.totalConversations)

    const totalOnline = agents.filter(a => a.is_online).length
    const totalOffline = agents.filter(a => !a.is_online).length

    return NextResponse.json({
      agents: agentMetrics,
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: new Date().toISOString(),
      totalOnline,
      totalOffline,
    })
  } catch (error) {
    console.error('Supervisor API Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
