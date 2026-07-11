'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { useSupervisorMetrics } from '@/hooks/use-supervisor-metrics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getInitials } from '@/lib/utils'
import {
  Shield,
  Users,
  Clock,
  CheckCircle,
  MessageCircle,
  TrendingUp,
  Activity,
} from 'lucide-react'

export default function SupervisorPage() {
  const router = useRouter()
  const { agent } = useAuthStore()
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const { data, isLoading, error } = useSupervisorMetrics(period)

  useEffect(() => {
    if (agent && agent.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [agent, router])

  if (error === 'Acesso negado') {
    router.push('/dashboard')
    return null
  }

  const periodLabels = { today: 'Hoje', week: 'Esta Semana', month: 'Este Mês' }

  const workloadData = data?.agents
    .filter(a => a.isOnline)
    .map(a => {
      const avg = data.agents.reduce((sum, ag) => sum + ag.totalConversations, 0) / Math.max(data.agents.length, 1)
      return {
        name: a.agentName.split(' ')[0],
        conversas: a.totalConversations,
        isOverloaded: a.totalConversations > avg * 1.5,
      }
    }) || []

  return (
    <div className="p-6 space-y-5 overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Painel do Supervisor</h1>
            <p className="text-xs text-slate-500">
              Monitore o desempenho da equipe em tempo real
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1 text-[10px]">
              <Activity className="h-3 w-3 text-green-500 animate-pulse" />
              Tempo real
            </Badge>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <TabsList>
                <TabsTrigger value="today" className="text-xs">Hoje</TabsTrigger>
                <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
                <TabsTrigger value="month" className="text-xs">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-green-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{data?.totalOnline || 0}</p>
                  <p className="text-[11px] text-slate-500">Online agora</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-gray-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{data?.totalOffline || 0}</p>
                  <p className="text-[11px] text-slate-500">Offline</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">
                    {data?.agents.reduce((sum, a) => sum + a.totalConversations, 0) || 0}
                  </p>
                  <p className="text-[11px] text-slate-500">Total conversas ({periodLabels[period]})</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">
                    {data?.agents.length ? Math.round(data.agents.reduce((sum, a) => sum + a.resolutionRate, 0) / data.agents.length) : 0}%
                  </p>
                  <p className="text-[11px] text-slate-500">Taxa resolução média</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Panel */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Desempenho por Agente — {periodLabels[period]}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : !data?.agents.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="text-left py-3 px-2 text-xs font-medium">Agente</th>
                      <th className="text-center py-3 px-2 text-xs font-medium">Status</th>
                      <th className="text-center py-3 px-2 text-xs font-medium">Total</th>
                      <th className="text-center py-3 px-2 text-xs font-medium">Média/dia</th>
                      <th className="text-center py-3 px-2 text-xs font-medium">Tempo resposta</th>
                      <th className="text-center py-3 px-2 text-xs font-medium">Resolução</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.agents.map((agent) => (
                      <tr key={agent.agentId} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={agent.avatarUrl || ''} />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(agent.agentName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{agent.agentName}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2">
                          <Badge variant={agent.isOnline ? 'success' : 'secondary'} className="text-[10px]">
                            {agent.isOnline ? 'Online' : 'Offline'}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-2 font-semibold text-sm">
                          {agent.totalConversations}
                        </td>
                        <td className="text-center py-3 px-2 text-sm">
                          {agent.avgDailyConversations}
                        </td>
                        <td className="text-center py-3 px-2">
                          <div className="flex items-center justify-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {agent.avgResponseTimeMinutes !== null ? `${agent.avgResponseTimeMinutes}min` : '--'}
                          </div>
                        </td>
                        <td className="text-center py-3 px-2">
                          <div className="flex items-center justify-center gap-1 text-sm">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {agent.resolutionRate}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workload Chart */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Distribuição de Carga (Agentes Online)</CardTitle>
          </CardHeader>
          <CardContent>
            {workloadData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum agente online</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={workloadData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="conversas" radius={[4, 4, 0, 0]} name="Conversas">
                    {workloadData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isOverloaded ? '#ef4444' : 'hsl(24, 95%, 53%)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-[10px] text-slate-500 mt-2">
              🔴 Vermelho = carga acima de 150% da média da equipe
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
