'use client'

import { useEffect, useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Search, Plus, Filter, Users } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface CrmLead {
  id: string
  name: string
  company: string | null
  phone: string
  tags: string[]
  assignedAgents: { name: string; color: string }[]
  attachments: number
  stage: string
  created_at: string
  contact_id: string
}

interface CrmStage {
  id: string
  name: string
  color: string
  leads: CrmLead[]
}

const STAGES: { id: string; name: string; color: string }[] = [
  { id: 'initial', name: 'CONTATO INICIAL', color: 'bg-blue-500' },
  { id: 'contacted', name: 'CONTATO REALIZADO', color: 'bg-green-500' },
  { id: 'registered', name: 'CADASTRADO', color: 'bg-yellow-500' },
  { id: 'completed', name: 'CONCLUÍDO', color: 'bg-purple-500' },
]

export default function CrmPage() {
  const [stages, setStages] = useState<CrmStage[]>(
    STAGES.map((s) => ({ ...s, leads: [] }))
  )
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  const fetchLeads = useCallback(async () => {
    try {
      const response = await fetch('/api/crm')
      if (response.ok) {
        const data = await response.json()
        setStages(
          STAGES.map((stage) => ({
            ...stage,
            leads: data.filter((lead: CrmLead) => lead.stage === stage.id),
          }))
        )
      }
    } catch (error) {
      console.error('Error fetching CRM leads:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
    const interval = setInterval(fetchLeads, 15000)
    return () => clearInterval(interval)
  }, [fetchLeads])

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const sourceStageId = result.source.droppableId
    const destStageId = result.destination.droppableId
    const leadId = result.draggableId

    if (sourceStageId === destStageId) return

    // Optimistic update
    setStages((prev) => {
      const newStages = prev.map((stage) => ({ ...stage, leads: [...stage.leads] }))
      const sourceStage = newStages.find((s) => s.id === sourceStageId)
      const destStage = newStages.find((s) => s.id === destStageId)

      if (!sourceStage || !destStage) return prev

      const leadIndex = sourceStage.leads.findIndex((l) => l.id === leadId)
      if (leadIndex === -1) return prev

      const [lead] = sourceStage.leads.splice(leadIndex, 1)
      lead.stage = destStageId
      destStage.leads.splice(result.destination!.index, 0, lead)

      return newStages
    })

    // Update backend
    try {
      const response = await fetch('/api/crm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, stage: destStageId }),
      })

      if (!response.ok) {
        toast({ title: 'Erro ao mover lead', variant: 'destructive' })
        fetchLeads()
      }
    } catch {
      toast({ title: 'Erro ao mover lead', variant: 'destructive' })
      fetchLeads()
    }
  }

  const filteredStages = stages.map((stage) => ({
    ...stage,
    leads: stage.leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.company && lead.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        lead.phone.includes(searchQuery)
    ),
  }))

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 h-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">CRM</h1>
        </div>
        <div className="grid grid-cols-4 gap-4 h-[calc(100%-80px)]">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Triagem de Leads</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar lead..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 overflow-hidden">
          {filteredStages.map((stage) => (
            <div key={stage.id} className="flex flex-col bg-muted/30 rounded-lg overflow-hidden">
              {/* Column Header */}
              <div className="p-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {stage.name}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {stage.leads.length}
                </Badge>
              </div>

              {/* Cards */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto p-2 space-y-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-primary/5' : ''
                    }`}
                  >
                    {stage.leads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 cursor-grab active:cursor-grabbing transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
                            }`}
                          >
                            {/* Color bars */}
                            <div className="flex gap-1 mb-2">
                              {lead.tags.slice(0, 3).map((tag, i) => (
                                <div
                                  key={i}
                                  className="h-1 w-8 rounded-full"
                                  style={{
                                    backgroundColor: ['#ef4444', '#3b82f6', '#22c55e', '#eab308'][i % 4],
                                  }}
                                />
                              ))}
                              {lead.tags.length === 0 && (
                                <div className="h-1 w-8 rounded-full bg-gray-300" />
                              )}
                            </div>

                            {/* Lead Info */}
                            <p className="font-medium text-sm">{lead.name}</p>
                            {lead.company && (
                              <p className="text-xs text-muted-foreground">{lead.company}</p>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex -space-x-1">
                                {lead.assignedAgents.slice(0, 3).map((agent, i) => (
                                  <Avatar key={i} className="h-5 w-5 border-2 border-background">
                                    <AvatarFallback
                                      className="text-[8px]"
                                      style={{ backgroundColor: agent.color, color: 'white' }}
                                    >
                                      {getInitials(agent.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                              {lead.attachments > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  📎 {lead.attachments}
                                </span>
                              )}
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* Add new */}
                    <Button
                      variant="ghost"
                      className="w-full text-xs text-muted-foreground hover:text-primary"
                      size="sm"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Criar novo
                    </Button>
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
