'use client'

import { useState, useEffect } from 'react'
import { Node, Edge, MarkerType } from 'reactflow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  Bot,
  Plus,
  Power,
  PowerOff,
  Trash2,
  Pencil,
  Copy,
  MessageSquare,
  GitBranch,
  ArrowRightLeft,
} from 'lucide-react'
import { FlowBuilder } from '@/components/chatbot/flow-builder'

interface ChatbotNode {
  id: string
  title: string
  node_type: string
  message: string | null
  options: any[] | null
  action_type: string | null
  action_data: any
  delay_seconds: number
  position_x: number
  position_y: number
  is_start: boolean
}

interface ChatbotFlow {
  id: string
  name: string
  description: string | null
  is_active: boolean
  trigger_type: string
  trigger_keywords: string[]
  nodes: ChatbotNode[]
  created_at: string
}

interface Preset {
  name: string
  description: string
  trigger_type: string
  trigger_keywords: string[]
  nodes: any[]
}

export default function ChatbotsPage() {
  const [flows, setFlows] = useState<ChatbotFlow[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null)
  const [newFlow, setNewFlow] = useState({ name: '', description: '', trigger_keywords: '' })
  const { toast } = useToast()

  const fetchFlows = async () => {
    try {
      const res = await fetch('/api/chatbots')
      if (res.ok) {
        const data = await res.json()
        setFlows(data.flows || [])
        setPresets(data.presets || [])
      }
    } catch {} finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchFlows() }, [])

  const handleUsePreset = async (index: number) => {
    try {
      const res = await fetch('/api/chatbots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_index: index }),
      })
      if (res.ok) {
        toast({ title: 'Robô criado! Clique em Editar para ver o fluxo.' })
        fetchFlows()
      }
    } catch {
      toast({ title: 'Erro ao criar', variant: 'destructive' })
    }
  }

  const handleCreate = async () => {
    if (!newFlow.name) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/chatbots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFlow.name,
          description: newFlow.description,
          trigger_type: 'keyword',
          trigger_keywords: newFlow.trigger_keywords.split(',').map(s => s.trim()).filter(Boolean),
        }),
      })
      if (res.ok) {
        const flow = await res.json()
        toast({ title: 'Robô criado!' })
        setShowCreateDialog(false)
        setNewFlow({ name: '', description: '', trigger_keywords: '' })
        fetchFlows()
        // Abrir editor automaticamente
        setEditingFlowId(flow.id)
      }
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleToggle = async (flow: ChatbotFlow) => {
    try {
      await fetch('/api/chatbots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: flow.id, is_active: !flow.is_active }),
      })
      toast({ title: flow.is_active ? 'Robô desativado' : 'Robô ativado!' })
      fetchFlows()
    } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este robô e todo o fluxo?')) return
    try {
      await fetch('/api/chatbots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      toast({ title: 'Robô excluído' })
      fetchFlows()
    } catch {}
  }

  const handleSaveFlow = async (nodes: Node[], edges: Edge[]) => {
    if (!editingFlowId) return

    // Converter nodes do ReactFlow para formato do banco
    const dbNodes = nodes.map((node) => ({
      id: node.id,
      flow_id: editingFlowId,
      node_type: node.type || 'message',
      title: node.type === 'start' ? 'Início' : node.data.message?.slice(0, 30) || node.data.action_type || 'Nó',
      message: node.data.message || null,
      options: node.data.options || null,
      action_type: node.data.action_type || null,
      action_data: node.data.tag ? { tag: node.data.tag } : null,
      delay_seconds: node.data.delay_seconds || 0,
      position_x: node.position.x,
      position_y: node.position.y,
      is_start: node.type === 'start',
    }))

    // Salvar via API
    try {
      const res = await fetch('/api/chatbots/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow_id: editingFlowId, nodes: dbNodes, edges }),
      })
      if (res.ok) {
        toast({ title: 'Fluxo salvo com sucesso!' })
        fetchFlows()
      } else {
        toast({ title: 'Erro ao salvar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  // Se está editando, mostrar o builder
  if (editingFlowId) {
    const flow = flows.find(f => f.id === editingFlowId)
    if (!flow) {
      setEditingFlowId(null)
      return null
    }

    // Converter nodes do banco para formato ReactFlow
    const rfNodes: Node[] = flow.nodes.length > 0
      ? flow.nodes.map((n) => ({
          id: n.id,
          type: n.is_start ? 'start' : n.node_type === 'options' ? 'condition' : n.node_type === 'action' ? 'action' : 'message',
          position: { x: n.position_x || 250, y: n.position_y || 0 },
          data: {
            message: n.message,
            options: n.options,
            action_type: n.action_type,
            delay_seconds: n.delay_seconds,
            tag: n.action_data?.tag,
          },
        }))
      : [{ id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: {} }]

    // Edges from options connections
    const rfEdges: Edge[] = []
    flow.nodes.forEach((node) => {
      if (node.options) {
        node.options.forEach((opt: any) => {
          if (opt.next_node_id) {
            rfEdges.push({
              id: `e-${node.id}-${opt.next_node_id}`,
              source: node.id,
              target: opt.next_node_id,
              animated: true,
              label: opt.label,
              style: { stroke: '#F26522', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#F26522' },
            })
          }
        })
      }
    })

    return (
      <div className="h-full">
        <FlowBuilder
          flowId={editingFlowId}
          flowName={flow.name}
          initialNodes={rfNodes}
          initialEdges={rfEdges}
          onSave={handleSaveFlow}
          onBack={() => setEditingFlowId(null)}
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Robôs (Chatbots)</h1>
            <p className="text-xs text-slate-500">Crie fluxos visuais de atendimento automático</p>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Robô
          </Button>
        </div>

        {/* Presets */}
        <div className="space-y-3">
          <h2 className="text-xs text-slate-500 font-medium uppercase tracking-wide">Modelos Prontos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {presets.map((preset, i) => (
              <Card key={i} className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-[#F26522]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{preset.name}</p>
                      <p className="text-[10px] text-slate-400">{preset.description}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => handleUsePreset(i)}>
                    <Copy className="h-3 w-3 mr-1.5" />
                    Usar modelo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Meus Robôs */}
        <div className="space-y-3">
          <h2 className="text-xs text-slate-500 font-medium uppercase tracking-wide">Meus Robôs</h2>

          {isLoading ? (
            <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : flows.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500 mb-1">Nenhum robô criado</p>
              <p className="text-xs text-slate-400">Use um modelo ou crie do zero</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flows.map((flow) => (
                <Card key={flow.id} className="border-0 shadow-sm bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium text-sm text-slate-800">{flow.name}</h3>
                          <Badge variant={flow.is_active ? 'default' : 'secondary'} className={`text-[10px] ${flow.is_active ? 'bg-green-100 text-green-700' : ''}`}>
                            {flow.is_active ? '● Ativo' : '○ Inativo'}
                          </Badge>
                        </div>
                        {flow.description && <p className="text-xs text-slate-500 mb-2">{flow.description}</p>}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] text-slate-400">Palavras-chave:</span>
                          {flow.trigger_keywords?.map((kw) => (
                            <Badge key={kw} variant="secondary" className="text-[9px]">{kw}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {flow.nodes.filter(n => n.node_type === 'message' || n.node_type === 'options').length} mensagens</span>
                          <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> {flow.nodes.filter(n => n.node_type === 'options').length} condições</span>
                          <span className="flex items-center gap-1"><ArrowRightLeft className="h-3 w-3" /> {flow.nodes.filter(n => n.node_type === 'action').length} ações</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" variant="outline" onClick={() => setEditingFlowId(flow.id)} className="text-xs">
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar Fluxo
                        </Button>
                        <Button
                          size="sm"
                          variant={flow.is_active ? 'outline' : 'default'}
                          onClick={() => handleToggle(flow)}
                          className={`text-xs ${!flow.is_active ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                        >
                          {flow.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(flow.id)} className="text-slate-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Robô</DialogTitle>
            <DialogDescription>Crie um fluxo automático de atendimento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Nome</Label>
              <Input placeholder="Ex: Atendimento Noturno" value={newFlow.name} onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Descrição</Label>
              <Input placeholder="O que esse robô faz?" value={newFlow.description} onChange={(e) => setNewFlow({ ...newFlow, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Palavras-chave que ativam (vírgula)</Label>
              <Input placeholder="oi, olá, menu, ajuda" value={newFlow.trigger_keywords} onChange={(e) => setNewFlow({ ...newFlow, trigger_keywords: e.target.value })} />
            </div>
            <Button onClick={handleCreate} className="w-full bg-[#F26522] hover:bg-[#d4561c]">
              <Bot className="h-4 w-4 mr-2" />
              Criar e Abrir Editor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
