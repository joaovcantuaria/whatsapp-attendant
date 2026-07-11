'use client'

import { useEffect, useState, useCallback } from 'react'

export interface AgentMetrics {
  agentId: string
  agentName: string
  avatarUrl: string | null
  isOnline: boolean
  totalConversations: number
  avgDailyConversations: number
  avgResponseTimeMinutes: number | null
  resolutionRate: number
}

export interface SupervisorMetricsResponse {
  agents: AgentMetrics[]
  period: string
  periodStart: string
  periodEnd: string
  totalOnline: number
  totalOffline: number
}

export function useSupervisorMetrics(period: 'today' | 'week' | 'month') {
  const [data, setData] = useState<SupervisorMetricsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/supervisor?period=${period}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else if (response.status === 403) {
        setError('Acesso negado')
      } else {
        setError('Erro ao carregar métricas')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  return { data, isLoading, error, refetch: fetchMetrics }
}
