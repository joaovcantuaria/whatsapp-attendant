'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, AlertTriangle, Clock, Cake, ListTodo, User } from 'lucide-react'
import Link from 'next/link'

interface Alert {
  id: string
  type: string
  title: string
  description: string
  severity: string
  contact_id?: string
  deal_id?: string
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      const res = await fetch('/api/crm/alerts')
      if (res.ok) setAlerts(await res.json())
      setIsLoading(false)
    }
    fetchAlerts()
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case 'inactive_client': return <User className="h-3.5 w-3.5" />
      case 'stale_deal': return <Clock className="h-3.5 w-3.5" />
      case 'birthday': return <Cake className="h-3.5 w-3.5" />
      case 'overdue_task': return <ListTodo className="h-3.5 w-3.5" />
      default: return <Bell className="h-3.5 w-3.5" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'ring-1 ring-red-200'
      case 'medium': return 'ring-1 ring-yellow-200'
      default: return ''
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return <Badge variant="destructive" className="text-[10px]">Urgente</Badge>
      case 'medium': return <Badge variant="warning" className="text-[10px]">Atenção</Badge>
      default: return <Badge variant="secondary" className="text-[10px]">Info</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Alertas</h1>
            <p className="text-xs text-slate-500">Notificações automáticas que exigem atenção</p>
          </div>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">{alerts.length}</Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{alerts.filter(a => a.severity === 'high').length}</p>
                  <p className="text-[11px] text-slate-500">Urgentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-yellow-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{alerts.filter(a => a.type === 'stale_deal').length}</p>
                  <p className="text-[11px] text-slate-500">Negociações paradas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-orange-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{alerts.filter(a => a.type === 'inactive_client').length}</p>
                  <p className="text-[11px] text-slate-500">Clientes inativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Cake className="h-3.5 w-3.5 text-pink-500" />
                <div>
                  <p className="text-xl font-bold text-slate-800">{alerts.filter(a => a.type === 'birthday').length}</p>
                  <p className="text-[11px] text-slate-500">Aniversários</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert List */}
        {alerts.length === 0 ? (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="py-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium text-sm">Nenhum alerta no momento</p>
              <p className="text-xs text-slate-500">Tudo está em dia!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => (
              <Card key={alert.id} className={`border-0 shadow-sm bg-white ${getSeverityColor(alert.severity)}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="shrink-0">{getIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs text-slate-500">{alert.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(alert.severity)}
                    {alert.contact_id && (
                      <Link href={`/crm/contacts/${alert.contact_id}`}>
                        <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">Ver</Badge>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
