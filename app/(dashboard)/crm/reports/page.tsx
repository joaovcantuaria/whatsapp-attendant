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
    return (
      <div className="p-6 space-y-5">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data) return (
    <div className="p-6 text-center text-muted-foreground">Erro ao carregar relatórios</div>
  )

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Relatórios</h1>
          <p className="text-xs text-slate-500">Inteligência e métricas do seu negócio</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-blue-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{data.conversionRate}%</p>
                  <p className="text-[11px] text-slate-500">Taxa de conversão</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-orange-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{data.avgClosingDays}d</p>
                  <p className="text-[11px] text-slate-500">Tempo médio fechamento</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="h-3.5 w-3.5 text-green-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{data.wonDeals}</p>
                  <p className="text-[11px] text-slate-500">Negociações ganhas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{data.atRiskClients.length}</p>
                  <p className="text-[11px] text-slate-500">Clientes em risco</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Receita por mês */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Receita - Últimos 6 meses</CardTitle>
            </CardHeader>
            <CardContent>
              {data.revenueByMonth.every((m: any) => m.value === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma receita registrada</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
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
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Top Clientes (Valor Total)</CardTitle>
            </CardHeader>
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
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Top Clientes (Frequência)</CardTitle>
            </CardHeader>
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
                      <Badge variant="secondary" className="text-[10px]">{client.count} compras</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clientes em risco */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Clientes em Risco
              </CardTitle>
            </CardHeader>
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
    </div>
  )
}
