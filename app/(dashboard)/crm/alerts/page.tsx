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
      case 'inactive_client': return <User className="h-4 w-4" />
      case 'stale_deal': return <Clock className="h-4 w-4" />
      case 'birthday': return <Cake className="h-4 w-4" />
      case 'overdue_task': return <ListTodo className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500/10 border-red-500/30 text-red-700'
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700'
      default: return 'bg-blue-500/10 border-blue-500/30 text-blue-700'
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return <Badge variant="destructive" className="text-[9px]">Urgente</Badge>
      case 'medium': return <Badge variant="warning" className="text-[9px]">Atenção</Badge>
      default: return <Badge variant="secondary" className="text-[9px]">Info</Badge>
    }
  }

  if (isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" />{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Alertas</h1>
          <p className="text-sm text-muted-foreground">Notificações automáticas que exigem atenção</p>
        </div>
        {alerts.length > 0 && (
          <Badge variant="destructive" className="ml-auto">{alerts.length}</Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div><p className="text-lg font-bold">{alerts.filter(a => a.severity === 'high').length}</p><p className="text-[10px] text-muted-foreground">Urgentes</p></div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <div><p className="text-lg font-bold">{alerts.filter(a => a.type === 'stale_deal').length}</p><p className="text-[10px] text-muted-foreground">Negociações paradas</p></div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-orange-500" />
            <div><p className="text-lg font-bold">{alerts.filter(a => a.type === 'inactive_client').length}</p><p className="text-[10px] text-muted-foreground">Clientes inativos</p></div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Cake className="h-4 w-4 text-pink-500" />
            <div><p className="text-lg font-bold">{alerts.filter(a => a.type === 'birthday').length}</p><p className="text-[10px] text-muted-foreground">Aniversários</p></div>
          </div>
        </Card>
      </div>

      {/* Alert List */}
      {alerts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-medium">Nenhum alerta no momento</p>
            <p className="text-sm text-muted-foreground">Tudo está em dia!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => (
            <Card key={alert.id} className={`border ${getSeverityColor(alert.severity)}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="shrink-0">{getIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getSeverityBadge(alert.severity)}
                  {alert.contact_id && (
                    <Link href={`/crm/contacts/${alert.contact_id}`}>
                      <Badge variant="outline" className="text-[9px] cursor-pointer hover:bg-muted">Ver</Badge>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
