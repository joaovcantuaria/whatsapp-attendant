'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardMetrics } from '@/types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  MessageCircle,
  Clock,
  CheckCircle,
  Users,
  TrendingUp,
} from 'lucide-react'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/dashboard')
        if (response.ok) setMetrics(await response.json())
      } catch (error) {
        console.error('Error fetching metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 h-full overflow-y-auto">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
      </div>
    )
  }

  const kpis = [
    { label: 'Conversas em andamento', value: metrics?.openConversations || 0, icon: MessageCircle, color: 'text-blue-500' },
    { label: 'Pendentes', value: metrics?.pendingConversations || 0, icon: Clock, color: 'text-yellow-500' },
    { label: 'Resolvidas hoje', value: metrics?.closedConversations || 0, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Taxa de resolução', value: `${metrics?.resolutionRate || 0}%`, icon: TrendingUp, color: 'text-purple-500' },
  ]

  const chartData = metrics?.messagesLast7Days?.map(d => ({
    date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    mensagens: d.count,
  })) || []

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      {/* Header */}
      <div className="max-w-5xl mx-auto space-y-5">
        <h1 className="text-lg font-semibold text-slate-800">Dashboard</h1>
      </div>

      {/* KPI Cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <Card key={i} className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-xl font-bold text-slate-800">{kpi.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Conversas Iniciadas */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700">Total de conversas</CardTitle>
              <span className="text-xs text-slate-400">Últimos 7 dias</span>
            </div>
            <p className="text-xs text-slate-500">Quantidade de conversas iniciadas no período</p>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" fontSize={10} stroke="#94a3b8" />
                  <YAxis fontSize={10} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="mensagens" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tempo de atendimento */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700">Tempo de atendimento</CardTitle>
            </div>
            <p className="text-xs text-slate-500">Tempo médio para finalizar um atendimento</p>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-40">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-800">
                {metrics?.averageResponseTime ? `${Math.round(metrics.averageResponseTime)}min` : '00h:00m'}
              </p>
              <p className="text-xs text-slate-500 mt-2">Média geral</p>
            </div>
          </CardContent>
        </Card>

        {/* Primeira resposta */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700">Primeira resposta</CardTitle>
            </div>
            <p className="text-xs text-slate-500">Tempo médio da primeira interação com atendente</p>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-40">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-800">
                {metrics?.averageResponseTime ? `${Math.round(metrics.averageResponseTime)}min` : '00h:00m'}
              </p>
              <p className="text-xs text-slate-500 mt-2">Média geral</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents performance */}
      {metrics?.conversationsByAgent && metrics.conversationsByAgent.length > 0 && (
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Desempenho por atendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.conversationsByAgent.map((agent, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-semibold text-orange-600">
                    {agent.agent.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{agent.agent}</span>
                      <span className="text-sm text-slate-500">{agent.count} conversas</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all"
                        style={{ width: `${Math.min((agent.count / Math.max(...metrics.conversationsByAgent.map(a => a.count))) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
