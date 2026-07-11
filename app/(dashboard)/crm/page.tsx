'use client'

import { useEffect, useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Search, Plus, Filter, TrendingUp, DollarSign, Target,
  CheckCircle, Users, Calendar, Kanban,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface CrmDeal {
  id: string
  title: string
  value: number
  status: string
  stage_id: string
  contact_id: string | null
  agent_id: string | null
  created_at: string
  contact?: { id: string; name: string; phone: string } | null
  agent?: { id: string; name: string } | null
}

interface CrmStage {
  id: string
  name: string
  position: number
  color: string
  pipeline_id: string
}

interface CrmDashboardData {
  totalOpenDeals: number
  totalPipelineValue: number
  wonThisMonth: number
  wonValue: number
  lostThisMonth: number
  tasksDueToday: number
  newContactsMonth: number
  conversionRate: number
}

export default function CrmPage() {
  const [stages, setStages] = useState<CrmStage[]>([])
  const [deals, setDeals] = useState<CrmDeal[]>([])
  const [dashboard, setDashboard] = useState<CrmDashboardData | null>(null)
  const [pipelineId, setPipelineId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewDeal, setShowNewDeal] = useState(false)
  const [newDeal, setNewDeal] = useState({ title: '', value: '', contact_id: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      const [pipelineRes, dashRes, contactsRes] = await Promise.all([
        fetch('/api/crm/pipeline'),
        fetch('/api/crm/dashboard'),
        fetch('/api/contacts'),
      ])

      if (pipelineRes.ok) {
        const data = await pipelineRes.json()
        setStages(data.stages || [])
        setDeals(data.deals || [])
        setPipelineId(data.pipeline?.id || '')
      }

      if (dashRes.ok) {
        const dashData = await dashRes.json()
        setDashboard(dashData)
      }

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json()
        setContacts(contactsData || [])
      }
    } catch (error) {
      console.error('Error fetching CRM data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const dealId = result.draggableId
    const destStageId = result.destination.droppableId

    if (result.source.droppableId === destStageId) return

    // Optimistic update
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage_id: destStageId } : d))

    try {
      const response = await fetch('/api/crm/pipeline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dealId, stage_id: destStageId }),
      })
      if (!response.ok) {
        toast({ title: 'Erro ao mover negociação', variant: 'destructive' })
        fetchData()
      }
    } catch {
      fetchData()
    }
  }

  const handleCreateDeal = async () => {
    if (!newDeal.title) {
      toast({ title: 'Título é obrigatório', variant: 'destructive' })
      return
    }

    setIsCreating(true)
    try {
      const firstStage = stages[0]
      if (!firstStage) return

      const response = await fetch('/api/crm/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDeal.title,
          value: parseFloat(newDeal.value) || 0,
          contact_id: newDeal.contact_id || null,
          stage_id: firstStage.id,
          pipeline_id: pipelineId,
        }),
      })

      if (response.ok) {
        toast({ title: 'Negociação criada!' })
        setShowNewDeal(false)
        setNewDeal({ title: '', value: '', contact_id: '' })
        fetchData()
      } else {
        toast({ title: 'Erro ao criar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao criar', variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleMarkWon = async (dealId: string) => {
    await fetch('/api/crm/pipeline', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dealId, status: 'won' }),
    })
    toast({ title: 'Negociação marcada como ganha!' })
    fetchData()
  }

  const handleMarkLost = async (dealId: string, reason: string) => {
    await fetch('/api/crm/pipeline', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dealId, status: 'lost', lost_reason: reason }),
    })
    toast({ title: 'Negociação marcada como perdida' })
    fetchData()
  }

  const filteredDeals = deals.filter(d =>
    !searchQuery ||
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 h-full">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Kanban className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">CRM</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-52" />
          </div>
          <Button onClick={() => setShowNewDeal(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Negociação
          </Button>
        </div>
      </div>

      {/* Dashboard KPIs */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-lg font-bold">{dashboard.totalOpenDeals}</p>
                <p className="text-[10px] text-muted-foreground">No funil</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-lg font-bold">R$ {dashboard.totalPipelineValue.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-muted-foreground">Valor aberto</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-lg font-bold">{dashboard.wonThisMonth}</p>
                <p className="text-[10px] text-muted-foreground">Ganhas (mês)</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-lg font-bold">{dashboard.conversionRate}%</p>
                <p className="text-[10px] text-muted-foreground">Conversão</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Pipeline Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 flex-1 overflow-x-auto pb-2">
          {stages.map((stage) => {
            const stageDeals = filteredDeals.filter(d => d.stage_id === stage.id)
            const stageValue = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)

            return (
              <div key={stage.id} className="flex flex-col min-w-[280px] w-[280px] bg-muted/30 rounded-lg overflow-hidden">
                {/* Column Header */}
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-xs font-bold uppercase tracking-wide">{stage.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{stageDeals.length}</Badge>
                  </div>
                  {stageValue > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      R$ {stageValue.toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>

                {/* Cards */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto p-2 space-y-2 ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                    >
                      {stageDeals.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}`}
                            >
                              <p className="font-medium text-sm mb-1">{deal.title}</p>
                              {deal.contact && (
                                <p className="text-xs text-muted-foreground mb-2">{deal.contact.name}</p>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-green-600">
                                  {Number(deal.value) > 0 ? `R$ ${Number(deal.value).toLocaleString('pt-BR')}` : ''}
                                </span>
                                {deal.agent && (
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[8px]">{getInitials(deal.agent.name)}</AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      {/* New Deal Dialog */}
      <Dialog open={showNewDeal} onOpenChange={setShowNewDeal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Negociação</DialogTitle>
            <DialogDescription>Adicione uma nova oportunidade ao funil</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input placeholder="Ex: Proposta website" value={newDeal.title} onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input placeholder="0,00" type="number" value={newDeal.value} onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contato (opcional)</Label>
              <Select value={newDeal.contact_id || 'none'} onValueChange={(v) => setNewDeal({ ...newDeal, contact_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar contato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem contato vinculado</SelectItem>
                  {contacts.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name || c.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateDeal} className="w-full" disabled={isCreating}>
              {isCreating ? 'Criando...' : 'Criar Negociação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
