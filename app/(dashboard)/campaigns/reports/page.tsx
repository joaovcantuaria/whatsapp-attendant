'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Megaphone,
  Send,
  CheckCircle2,
  Eye,
  XCircle,
  Users,
  TrendingUp,
  Calendar,
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  status: string
  template_name: string
  total_contacts: number
  sent_count: number
  delivered_count: number
  read_count: number
  failed_count: number
  completed_at: string | null
  created_at: string
}

export default function CampaignReportsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns')
        if (res.ok) setCampaigns(await res.json())
      } catch {} finally {
        setIsLoading(false)
      }
    }
    fetchCampaigns()
  }, [])

  const completedCampaigns = campaigns.filter(c => c.status === 'completed')
  const totalSent = completedCampaigns.reduce((acc, c) => acc + c.sent_count, 0)
  const totalDelivered = completedCampaigns.reduce((acc, c) => acc + c.delivered_count, 0)
  const totalRead = completedCampaigns.reduce((acc, c) => acc + c.read_count, 0)
  const totalFailed = completedCampaigns.reduce((acc, c) => acc + c.failed_count, 0)
  const totalContacts = completedCampaigns.reduce((acc, c) => acc + c.total_contacts, 0)

  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0
  const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0
  const failRate = totalSent > 0 ? Math.round((totalFailed / (totalSent + totalFailed)) * 100) : 0

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Relatório de Campanhas</h1>
          <p className="text-xs text-slate-500">Métricas consolidadas de todos os disparos</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Megaphone className="h-3.5 w-3.5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{completedCampaigns.length}</p>
              <p className="text-[10px] text-slate-500">Campanhas enviadas</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-green-50 flex items-center justify-center">
                  <Send className="h-3.5 w-3.5 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{totalSent}</p>
              <p className="text-[10px] text-slate-500">Mensagens enviadas</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Eye className="h-3.5 w-3.5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{readRate}%</p>
              <p className="text-[10px] text-slate-500">Taxa de leitura</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-orange-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{totalContacts}</p>
              <p className="text-[10px] text-slate-500">Contatos alcançados</p>
            </CardContent>
          </Card>
        </div>

        {/* Rates */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-50 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-xl font-bold text-green-600">{deliveryRate}%</p>
              <p className="text-[10px] text-slate-500">Taxa de entrega</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-purple-50 mb-2">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-xl font-bold text-purple-600">{readRate}%</p>
              <p className="text-[10px] text-slate-500">Taxa de leitura</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-50 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-xl font-bold text-red-600">{failRate}%</p>
              <p className="text-[10px] text-slate-500">Taxa de falha</p>
            </CardContent>
          </Card>
        </div>

        {/* Campaign List */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-700">Histórico de campanhas</h2>
          {completedCampaigns.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Nenhuma campanha concluída ainda</p>
          ) : (
            completedCampaigns.map((campaign) => {
              const cDeliveryRate = campaign.sent_count > 0 ? Math.round((campaign.delivered_count / campaign.sent_count) * 100) : 0
              const cReadRate = campaign.delivered_count > 0 ? Math.round((campaign.read_count / campaign.delivered_count) * 100) : 0

              return (
                <Card key={campaign.id} className="border-0 shadow-sm bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-slate-800">{campaign.name}</h3>
                        <p className="text-[10px] text-slate-400">
                          Template: {campaign.template_name} • {campaign.completed_at && new Date(campaign.completed_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">
                        Concluída
                      </Badge>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full flex">
                        <div className="bg-green-500 transition-all" style={{ width: `${cDeliveryRate}%` }} />
                        <div className="bg-purple-500 transition-all" style={{ width: `${cReadRate * (cDeliveryRate / 100)}%` }} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-5 gap-2 text-center">
                      <div>
                        <p className="text-xs font-bold text-slate-700">{campaign.total_contacts}</p>
                        <p className="text-[9px] text-slate-400">Contatos</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-green-600">{campaign.sent_count}</p>
                        <p className="text-[9px] text-slate-400">Enviadas</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-600">{campaign.delivered_count}</p>
                        <p className="text-[9px] text-slate-400">Entregues</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-purple-600">{campaign.read_count}</p>
                        <p className="text-[9px] text-slate-400">Lidas</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-red-600">{campaign.failed_count}</p>
                        <p className="text-[9px] text-slate-400">Falharam</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
