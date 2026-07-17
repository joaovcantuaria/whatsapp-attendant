import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

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

    const period = request.nextUrl.searchParams.get('period') || '7d'
    const daysMap: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30 }
    const days = daysMap[period] || 7
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Buscar conversas com primeiro response time
    const { data: conversations } = await serviceClient
      .from('conversations')
      .select('id, created_at, status, agent_id')
      .eq('company_id', member.company_id)
      .gte('created_at', since)

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        averageResponseTimeSeconds: 0,
        averageResolutionTimeSeconds: 0,
        totalConversations: 0,
        resolvedConversations: 0,
        responseTimeByAgent: [],
      })
    }

    // Para cada conversa, calcular tempo de primeira resposta
    const responseTimes: number[] = []
    const agentResponseTimes: Record<string, { total: number; count: number; name: string }> = {}

    for (const conv of conversations.slice(0, 100)) { // Limitar a 100 para performance
      // Buscar primeira mensagem inbound e primeira outbound
      const { data: firstInbound } = await serviceClient
        .from('messages')
        .select('created_at')
        .eq('conversation_id', conv.id)
        .eq('direction', 'inbound')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      const { data: firstOutbound } = await serviceClient
        .from('messages')
        .select('created_at, agent_id')
        .eq('conversation_id', conv.id)
        .eq('direction', 'outbound')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (firstInbound && firstOutbound) {
        const responseTime = (new Date(firstOutbound.created_at).getTime() - new Date(firstInbound.created_at).getTime()) / 1000
        if (responseTime > 0 && responseTime < 86400) { // Ignorar se > 24h (provavelmente dados ruins)
          responseTimes.push(responseTime)

          if (firstOutbound.agent_id) {
            if (!agentResponseTimes[firstOutbound.agent_id]) {
              agentResponseTimes[firstOutbound.agent_id] = { total: 0, count: 0, name: '' }
            }
            agentResponseTimes[firstOutbound.agent_id].total += responseTime
            agentResponseTimes[firstOutbound.agent_id].count++
          }
        }
      }
    }

    // Buscar nomes dos agentes
    const agentIds = Object.keys(agentResponseTimes)
    if (agentIds.length > 0) {
      const { data: agents } = await serviceClient
        .from('agents')
        .select('id, name')
        .in('id', agentIds)

      agents?.forEach(a => {
        if (agentResponseTimes[a.id]) {
          agentResponseTimes[a.id].name = a.name
        }
      })
    }

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0

    const resolvedCount = conversations.filter(c => c.status === 'closed').length

    const responseTimeByAgent = Object.entries(agentResponseTimes).map(([id, data]) => ({
      agentId: id,
      agentName: data.name || 'Desconhecido',
      averageSeconds: data.count > 0 ? Math.round(data.total / data.count) : 0,
      totalResponses: data.count,
    }))

    return NextResponse.json({
      averageResponseTimeSeconds: Math.round(avgResponseTime),
      totalConversations: conversations.length,
      resolvedConversations: resolvedCount,
      resolutionRate: conversations.length > 0 ? Math.round((resolvedCount / conversations.length) * 100) : 0,
      responseTimeByAgent: responseTimeByAgent.sort((a, b) => a.averageSeconds - b.averageSeconds),
    })
  } catch (error) {
    console.error('Response time report error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
