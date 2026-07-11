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

  // Role guard
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

  // Dados pro gráfico de carga
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
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Painel do Supervisor</h1>
            <p className="text-sm text-muted-foreground">
              Monitore o desempenho da equipe em tempo real
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-1">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <Users className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.totalOnline || 0}</p>
                <p className="text-xs text-muted-foreground">Online agora</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gray-500/10">
                <Users className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.totalOffline || 0}</p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <MessageCircle className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data?.agents.reduce((sum, a) => sum + a.totalConversations, 0) || 0}
                </p>
                <p className="text-xs text-muted-foreground">Total conversas ({periodLabels[period]})</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data?.agents.length ? Math.round(data.agents.reduce((sum, a) => sum + a.resolutionRate, 0) / data.agents.length) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Taxa resolução média</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desempenho por Agente — {periodLabels[period]}</CardTitle>
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
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-2">Agente</th>
                    <th className="text-center py-3 px-2">Status</th>
                    <th className="text-center py-3 px-2">Total</th>
                    <th className="text-center py-3 px-2">Média/dia</th>
                    <th className="text-center py-3 px-2">Tempo resposta</th>
                    <th className="text-center py-3 px-2">Resolução</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agents.map((agent) => (
                    <tr key={agent.agentId} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={agent.avatarUrl || ''} />
                            <AvatarFallback className="text-xs">
                              {getInitials(agent.agentName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{agent.agentName}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <Badge variant={agent.isOnline ? 'success' : 'secondary'} className="text-[10px]">
                          {agent.isOnline ? 'Online' : 'Offline'}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-2 font-semibold">
                        {agent.totalConversations}
                      </td>
                      <td className="text-center py-3 px-2">
                        {agent.avgDailyConversations}
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {agent.avgResponseTimeMinutes !== null ? `${agent.avgResponseTimeMinutes}min` : '--'}
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="flex items-center justify-center gap-1">
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Carga (Agentes Online)</CardTitle>
        </CardHeader>
        <CardContent>
          {workloadData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum agente online</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
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
          <p className="text-[10px] text-muted-foreground mt-2">
            🔴 Vermelho = carga acima de 150% da média da equipe
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
