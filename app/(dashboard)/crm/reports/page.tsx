'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, Clock, Target, AlertTriangle, DollarSign, Award } from 'lucide-react'

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      const res = await fetch('/api/crm/reports')
      if (res.ok) setData(await res.json())
      setIsLoading(false)
    }
    fetchReports()
  }, [])

  if (isLoading) {
    return <div className="p-6 space-y-6"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>
  }

  if (!data) return <div className="p-6 text-center text-muted-foreground">Erro ao carregar relatórios</div>

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Inteligência e métricas do seu negócio</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            <div><p className="text-2xl font-bold">{data.conversionRate}%</p><p className="text-xs text-muted-foreground">Taxa de conversão</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <div><p className="text-2xl font-bold">{data.avgClosingDays}d</p><p className="text-xs text-muted-foreground">Tempo médio fechamento</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-green-500" />
            <div><p className="text-2xl font-bold">{data.wonDeals}</p><p className="text-xs text-muted-foreground">Negociações ganhas</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div><p className="text-2xl font-bold">{data.atRiskClients.length}</p><p className="text-xs text-muted-foreground">Clientes em risco</p></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita por mês */}
        <Card>
          <CardHeader><CardTitle className="text-base">Receita - Últimos 6 meses</CardTitle></CardHeader>
          <CardContent>
            {data.revenueByMonth.every((m: any) => m.value === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma receita registrada</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                  <Bar dataKey="value" fill="hsl(24, 95%, 53%)" radius={[4, 4, 0, 0]} name="Receita" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top clientes por valor */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Clientes (Valor Total)</CardTitle></CardHeader>
          <CardContent>
            {data.topByValue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma compra registrada</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {data.topByValue.map((client: any, i: number) => (
                  <div key={client.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                    <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      <p className="text-[10px] text-muted-foreground">{client.count} compras • Ticket: R$ {Math.round(client.avgTicket).toLocaleString('pt-BR')}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">R$ {client.total.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top por frequência */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Clientes (Frequência)</CardTitle></CardHeader>
          <CardContent>
            {data.topByFrequency.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma compra registrada</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {data.topByFrequency.map((client: any, i: number) => (
                  <div key={client.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                    <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      <p className="text-[10px] text-muted-foreground">Total: R$ {client.total.toLocaleString('pt-BR')}</p>
                    </div>
                    <Badge variant="secondary">{client.count} compras</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clientes em risco */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Clientes em Risco</CardTitle></CardHeader>
          <CardContent>
            {data.atRiskClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente em risco</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {data.atRiskClients.map((client: any) => {
                  const days = Math.floor((Date.now() - new Date(client.updated_at).getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={client.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{client.name || client.phone}</p>
                        <p className="text-[10px] text-muted-foreground">{client.phone}</p>
                      </div>
                      <Badge variant="destructive" className="text-[10px]">{days} dias</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
