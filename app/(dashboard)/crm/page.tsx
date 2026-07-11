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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, Filter } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface CrmDeal {
  id: string; title: string; value: number; status: string; stage_id: string
  contact_id: string | null; agent_id: string | null; created_at: string
  contact?: { id: string; name: string; phone: string } | null
  agent?: { id: string; name: string } | null
}
interface CrmStage { id: string; name: string; position: number; color: string; pipeline_id: string }

const stageBackgrounds: Record<number, string> = {
  0: 'bg-red-50 border-red-200',
  1: 'bg-amber-50 border-amber-200',
  2: 'bg-blue-50 border-blue-200',
  3: 'bg-purple-50 border-purple-200',
  4: 'bg-green-50 border-green-200',
}

const stageHeaderColors: Record<number, string> = {
  0: 'text-red-700', 1: 'text-amber-700', 2: 'text-blue-700', 3: 'text-purple-700', 4: 'text-green-700',
}

const cardBarColors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#22c55e', '#f97316']

export default function CrmPage() {
  const [stages, setStages] = useState<CrmStage[]>([])
  const [deals, setDeals] = useState<CrmDeal[]>([])
  const [pipelineId, setPipelineId] = useState('')
  const [contacts, setContacts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewDeal, setShowNewDeal] = useState(false)
  const [newDealStage, setNewDealStage] = useState('')
  const [newDeal, setNewDeal] = useState({ title: '', value: '', contact_id: '' })
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      const [pipelineRes, contactsRes] = await Promise.all([
        fetch('/api/crm/pipeline'), fetch('/api/contacts'),
      ])
      if (pipelineRes.ok) {
        const data = await pipelineRes.json()
        setStages(data.stages || []); setDeals(data.deals || []); setPipelineId(data.pipeline?.id || '')
      }
      if (contactsRes.ok) setContacts(await contactsRes.json() || [])
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i) }, [fetchData])

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const dealId = result.draggableId
    const destStageId = result.destination.droppableId
    if (result.source.droppableId === destStageId) return
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage_id: destStageId } : d))
    const res = await fetch('/api/crm/pipeline', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dealId, stage_id: destStageId }),
    })
    if (!res.ok) fetchData()
  }

  const openNewDeal = (stageId: string) => { setNewDealStage(stageId); setShowNewDeal(true) }

  const handleCreateDeal = async () => {
    if (!newDeal.title) { toast({ title: 'Título obrigatório', variant: 'destructive' }); return }
    setIsCreating(true)
    const stageId = newDealStage || stages[0]?.id
    const res = await fetch('/api/crm/pipeline', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newDeal.title, value: parseFloat(newDeal.value) || 0, contact_id: newDeal.contact_id || null, stage_id: stageId, pipeline_id: pipelineId }),
    })
    if (res.ok) { toast({ title: 'Negociação criada!' }); setShowNewDeal(false); setNewDeal({ title: '', value: '', contact_id: '' }); fetchData() }
    setIsCreating(false)
  }

  const filteredDeals = deals.filter(d => !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()))

  if (isLoading) return <div className="p-6 h-full"><Skeleton className="h-full" /></div>

  return (
    <div className="p-5 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-800">Triagem de Leads</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Pesquisar card..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 w-48 text-xs border-slate-200" />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs"><Filter className="h-3 w-3 mr-1" /> Filtros</Button>
        </div>
      </div>

      {/* Pipeline */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 flex-1 overflow-x-auto pb-2">
          {stages.map((stage, stageIndex) => {
            const stageDeals = filteredDeals.filter(d => d.stage_id === stage.id)
            const bgClass = stageBackgrounds[stageIndex] || stageBackgrounds[0]
            const headerColor = stageHeaderColors[stageIndex] || stageHeaderColors[0]

            return (
              <div key={stage.id} className={`flex flex-col min-w-[260px] w-[260px] rounded-xl border ${bgClass} overflow-hidden`}>
                {/* Column Header */}
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${headerColor}`}>
                    {stage.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-white/80">
                    {stageDeals.length}
                  </Badge>
                </div>

                {/* Cards */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto px-2 pb-2 space-y-2 ${snapshot.isDraggingOver ? 'bg-white/30' : ''}`}
                    >
                      {stageDeals.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing border border-transparent ${snapshot.isDragging ? 'shadow-md ring-2 ring-orange-200' : 'hover:border-slate-200'}`}
                            >
                              {/* Color bars */}
                              <div className="flex gap-1 mb-2">
                                <div className="h-1 w-8 rounded-full" style={{ backgroundColor: cardBarColors[index % cardBarColors.length] }} />
                                <div className="h-1 w-5 rounded-full" style={{ backgroundColor: cardBarColors[(index + 2) % cardBarColors.length], opacity: 0.5 }} />
                              </div>

                              <p className="text-xs font-medium text-slate-800 mb-1">{deal.title}</p>
                              {deal.contact && (
                                <p className="text-[10px] text-slate-500 mb-2">{deal.contact.name}</p>
                              )}

                              {/* Footer */}
                              <div className="flex items-center justify-between">
                                <div className="flex -space-x-1">
                                  {deal.agent && (
                                    <Avatar className="h-5 w-5 border border-white">
                                      <AvatarFallback className="text-[7px] bg-green-100 text-green-700">
                                        {getInitials(deal.agent.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                                {Number(deal.value) > 0 && (
                                  <span className="text-[10px] font-medium text-slate-500">
                                    R$ {Number(deal.value).toLocaleString('pt-BR')}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {/* Add new button */}
                      <button
                        onClick={() => openNewDeal(stage.id)}
                        className={`w-full text-[11px] font-medium py-1.5 rounded-md transition-colors ${headerColor} hover:bg-white/50`}
                      >
                        + Criar novo
                      </button>
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
            <DialogTitle className="text-base">Nova Negociação</DialogTitle>
            <DialogDescription className="text-xs">Adicione ao funil</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Título</Label><Input placeholder="Ex: Proposta website" value={newDeal.title} onChange={e => setNewDeal({ ...newDeal, title: e.target.value })} className="h-8 text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Valor (R$)</Label><Input placeholder="0,00" type="number" value={newDeal.value} onChange={e => setNewDeal({ ...newDeal, value: e.target.value })} className="h-8 text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Contato</Label>
              <Select value={newDeal.contact_id || 'none'} onValueChange={v => setNewDeal({ ...newDeal, contact_id: v === 'none' ? '' : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{<SelectItem value="none" className="text-xs">Sem contato</SelectItem>}{contacts.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name || c.phone}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateDeal} className="w-full h-8 text-xs" disabled={isCreating}>{isCreating ? 'Criando...' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
