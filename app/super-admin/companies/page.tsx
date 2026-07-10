'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { formatRelativeTime } from '@/lib/utils'

interface CompanyRow {
  id: string
  name: string
  slug: string
  email: string
  plan_status: string
  created_at: string
  whatsapp_connected: boolean
  plan: { name: string; slug: string } | null
  members_count: number
  conversations_this_month: number
}

export default function SuperAdminCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const fetchCompanies = async () => {
    const response = await fetch('/api/super-admin/companies')
    if (response.ok) {
      setCompanies(await response.json())
    }
    setIsLoading(false)
  }

  useEffect(() => { fetchCompanies() }, [])

  const handleStatusChange = async (id: string, newStatus: string) => {
    const response = await fetch('/api/super-admin/companies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, plan_status: newStatus }),
    })
    if (response.ok) {
      toast({ title: `Status alterado para ${newStatus}` })
      fetchCompanies()
    }
  }

  if (isLoading) {
    return <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Todas as Empresas ({companies.length})</h2>

      <div className="space-y-3">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{company.name}</p>
                    <Badge variant={company.plan_status === 'active' ? 'success' : company.plan_status === 'trial' ? 'warning' : 'destructive'}>
                      {company.plan_status}
                    </Badge>
                    {company.whatsapp_connected && (
                      <Badge variant="outline" className="text-green-600">WA Conectado</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{company.email}</p>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Plano: {company.plan?.name || 'N/A'}</span>
                    <span>Membros: {company.members_count}</span>
                    <span>Conversas/mês: {company.conversations_this_month}</span>
                    <span>Criada: {formatRelativeTime(company.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {company.plan_status !== 'suspended' && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(company.id, 'suspended')}>
                      Suspender
                    </Button>
                  )}
                  {company.plan_status === 'suspended' && (
                    <Button size="sm" onClick={() => handleStatusChange(company.id, 'active')}>
                      Reativar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
