'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SuperAdminMetrics } from '@/types'
import { Building2, TrendingUp, Clock, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function SuperAdminPage() {
  const [metrics, setMetrics] = useState<SuperAdminMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/super-admin')
        if (response.ok) {
          setMetrics(await response.json())
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Visão Geral da Plataforma</h2>
        <nav className="flex gap-4 text-sm">
          <Link href="/super-admin/companies" className="text-primary hover:underline">Empresas</Link>
          <Link href="/super-admin/plans" className="text-primary hover:underline">Planos</Link>
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalCompanies || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeCompanies || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Trial</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.trialCompanies || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Estimada</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(metrics?.estimatedMonthlyRevenue || 0).toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">/mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Crescimento */}
      {metrics?.companiesByMonth && metrics.companiesByMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Empresas cadastradas por mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.companiesByMonth.map(({ month, count }) => (
                <div key={month} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{month}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-primary rounded" style={{ width: `${Math.max(20, count * 20)}px` }} />
                    <span className="font-medium">{count}</span>
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
