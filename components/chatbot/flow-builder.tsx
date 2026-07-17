'use client'

import { useCallback, useState, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MessageSquare,
  GitBranch,
  ArrowRightLeft,
  Clock,
  Tag,
  XCircle,
  Plus,
  Save,
  Trash2,
  Play,
} from 'lucide-react'

// Custom node types
function MessageNode({ data, selected }: NodeProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md border-2 min-w-[220px] ${selected ? 'border-[#F26522]' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
      <div className="px-3 py-2 bg-blue-50 rounded-t-xl border-b flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-[11px] font-semibold text-blue-700">Mensagem</span>
      </div>
      <div className="p-3">
        <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-4">{data.message || 'Clique para editar...'}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </div>
  )
}

function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md border-2 min-w-[220px] ${selected ? 'border-[#F26522]' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
      <div className="px-3 py-2 bg-amber-50 rounded-t-xl border-b flex items-center gap-2">
        <GitBranch className="h-3.5 w-3.5 text-amber-600" />
        <span className="text-[11px] font-semibold text-amber-700">Se / Então</span>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-3">{data.message || 'Pergunta...'}</p>
        {data.options && data.options.length > 0 && (
          <div className="space-y-1 mt-2">
            {data.options.map((opt: any, i: number) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-mono">{opt.value}</span>
                <span className="text-[10px] text-slate-500">{opt.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3" />
      {/* Handles laterais para cada opção */}
      <Handle type="source" position={Position.Right} id="option-1" className="!bg-green-500 !w-2.5 !h-2.5 !top-[60%]" />
      <Handle type="source" position={Position.Right} id="option-2" className="!bg-orange-500 !w-2.5 !h-2.5 !top-[75%]" />
    </div>
  )
}

function ActionNode({ data, selected }: NodeProps) {
  const actionLabels: Record<string, string> = {
    transfer_agent: '👤 Transferir para Humano',
    add_tag: '🏷️ Adicionar Tag',
    close: '✅ Encerrar Conversa',
    delay: '⏱️ Esperar',
    send_media: '📎 Enviar Mídia',
    collect_data: '📋 Coletar Dados',
    webhook: '🔗 Webhook (API externa)',
  }
  return (
    <div className={`bg-white rounded-xl shadow-md border-2 min-w-[200px] ${selected ? 'border-[#F26522]' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
      <div className="px-3 py-2 bg-green-50 rounded-t-xl border-b flex items-center gap-2">
        <ArrowRightLeft className="h-3.5 w-3.5 text-green-600" />
        <span className="text-[11px] font-semibold text-green-700">Ação</span>
      </div>
      <div className="p-3">
        <p className="text-xs font-medium text-slate-700">{actionLabels[data.action_type] || 'Selecione ação...'}</p>
        {data.message && <p className="text-[10px] text-slate-500 mt-1">{data.message}</p>}
        {data.action_type === 'delay' && <p className="text-[10px] text-slate-500 mt-1">Esperar {data.delay_seconds || 0}s</p>}
        {data.action_type === 'add_tag' && <p className="text-[10px] text-slate-500 mt-1">Tag: {data.tag || '...'}</p>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
    </div>
  )
}

function StartNode({ data, selected }: NodeProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md border-2 min-w-[180px] ${selected ? 'border-[#F26522]' : 'border-green-400'}`}>
      <div className="px-3 py-2 bg-green-100 rounded-t-xl border-b flex items-center gap-2">
        <Play className="h-3.5 w-3.5 text-green-700" />
        <span className="text-[11px] font-semibold text-green-700">Início</span>
      </div>
      <div className="p-3">
        <p className="text-[10px] text-slate-500">Quando ativado por palavra-chave</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
    </div>
  )
}

interface FlowBuilderProps {
  flowId: string
  flowName: string
  initialNodes: Node[]
  initialEdges: Edge[]
  onSave: (nodes: Node[], edges: Edge[]) => void
  onBack: () => void
}

export function FlowBuilder({ flowId, flowName, initialNodes, initialEdges, onSave, onBack }: FlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner flowId={flowId} flowName={flowName} initialNodes={initialNodes} initialEdges={initialEdges} onSave={onSave} onBack={onBack} />
    </ReactFlowProvider>
  )
}

function FlowBuilderInner({ flowId, flowName, initialNodes, initialEdges, onSave, onBack }: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingNode, setEditingNode] = useState<Node | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const reactFlowInstance = useReactFlow()
  const nodeTypes = useMemo(() => ({
    message: MessageNode,
    condition: ConditionNode,
    action: ActionNode,
    start: StartNode,
  }), [])

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: '#F26522', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#F26522' },
    }, eds))
  }, [setEdges])

  const addNode = useCallback((type: string) => {
    const id = `node-${Date.now()}`
    // Position in center of current viewport
    const { x, y, zoom } = reactFlowInstance.getViewport()
    const centerX = (-x + 400) / zoom
    const centerY = (-y + 300) / zoom + Math.random() * 50

    const newNode: Node = {
      id,
      type,
      position: { x: centerX, y: centerY },
      data: type === 'condition'
        ? { message: 'Escolha uma opção:', options: [{ value: '1', label: 'Opção 1' }, { value: '2', label: 'Opção 2' }] }
        : type === 'action'
        ? { action_type: 'transfer_agent', message: 'Transferindo...' }
        : { message: 'Olá! Como posso ajudar?' },
    }
    setNodes((nds) => [...nds, newNode])
  }, [reactFlowInstance, setNodes])

  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    if (node.type === 'start') return
    setEditingNode(node)
    setEditForm({ ...node.data })
    setShowEditDialog(true)
  }, [])

  const handleSaveNode = () => {
    if (!editingNode) return
    setNodes((nds) => nds.map((n) => n.id === editingNode.id ? { ...n, data: { ...editForm } } : n))
    setShowEditDialog(false)
    setEditingNode(null)
  }

  const handleDeleteNode = () => {
    if (!editingNode) return
    setNodes((nds) => nds.filter((n) => n.id !== editingNode.id))
    setEdges((eds) => eds.filter((e) => e.source !== editingNode.id && e.target !== editingNode.id))
    setShowEditDialog(false)
    setEditingNode(null)
  }

  const addOption = () => {
    const opts = editForm.options || []
    setEditForm({ ...editForm, options: [...opts, { value: String(opts.length + 1), label: `Opção ${opts.length + 1}` }] })
  }

  const removeOption = (idx: number) => {
    const opts = [...(editForm.options || [])]
    opts.splice(idx, 1)
    setEditForm({ ...editForm, options: opts })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white z-50 shrink-0" onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-xs">
            ← Voltar
          </Button>
          <span className="text-sm font-semibold text-slate-800">{flowName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); addNode('message') }} className="text-xs cursor-pointer">
            <MessageSquare className="h-3 w-3 mr-1.5 text-blue-600" />
            Mensagem
          </Button>
          <Button variant="outline" size="sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); addNode('condition') }} className="text-xs cursor-pointer">
            <GitBranch className="h-3 w-3 mr-1.5 text-amber-600" />
            Se/Então
          </Button>
          <Button variant="outline" size="sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); addNode('action') }} className="text-xs cursor-pointer">
            <ArrowRightLeft className="h-3 w-3 mr-1.5 text-green-600" />
            Ação
          </Button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <Button size="sm" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onSave(nodes, edges) }} className="bg-[#F26522] hover:bg-[#d4561c] text-xs cursor-pointer">
            <Save className="h-3 w-3 mr-1.5" />
            Salvar Fluxo
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-50"
          style={{ width: '100%', height: '100%' }}
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: '#F26522', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#F26522' },
          }}
        >
          <Controls className="!bg-white !border !shadow-sm" />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
        </ReactFlow>
      </div>

      {/* Edit Node Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Editar {editingNode?.type === 'message' ? 'Mensagem' : editingNode?.type === 'condition' ? 'Condição' : 'Ação'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Message field (for message and condition nodes) */}
            {(editingNode?.type === 'message' || editingNode?.type === 'condition') && (
              <div className="space-y-2">
                <Label className="text-xs">
                  {editingNode?.type === 'condition' ? 'Pergunta para o cliente' : 'Mensagem que o robô envia'}
                </Label>
                <Textarea
                  rows={4}
                  value={editForm.message || ''}
                  onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                  placeholder="Digite a mensagem..."
                  className="text-sm"
                />
              </div>
            )}

            {/* Options (for condition nodes) */}
            {editingNode?.type === 'condition' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Opções de resposta</Label>
                  <Button variant="ghost" size="sm" onClick={addOption} className="text-xs h-7">
                    <Plus className="h-3 w-3 mr-1" /> Opção
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editForm.options || []).map((opt: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        className="w-12 text-center text-xs"
                        value={opt.value}
                        onChange={(e) => {
                          const opts = [...editForm.options]
                          opts[i] = { ...opts[i], value: e.target.value }
                          setEditForm({ ...editForm, options: opts })
                        }}
                      />
                      <Input
                        className="flex-1 text-xs"
                        value={opt.label}
                        placeholder="Nome da opção"
                        onChange={(e) => {
                          const opts = [...editForm.options]
                          opts[i] = { ...opts[i], label: e.target.value }
                          setEditForm({ ...editForm, options: opts })
                        }}
                      />
                      <button onClick={() => removeOption(i)} className="text-slate-400 hover:text-red-500">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  Conecte cada saída do nó ao próximo bloco arrastando as bolinhas.
                </p>
              </div>
            )}

            {/* Action type (for action nodes) */}
            {editingNode?.type === 'action' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Tipo de ação</Label>
                  <Select value={editForm.action_type || ''} onValueChange={(v) => setEditForm({ ...editForm, action_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer_agent">👤 Transferir para Humano</SelectItem>
                      <SelectItem value="add_tag">🏷️ Adicionar Tag ao Contato</SelectItem>
                      <SelectItem value="delay">⏱️ Esperar X segundos</SelectItem>
                      <SelectItem value="close">✅ Encerrar Conversa</SelectItem>
                      <SelectItem value="send_media">📎 Enviar Mídia (imagem/doc)</SelectItem>
                      <SelectItem value="collect_data">📋 Coletar Dados do Contato</SelectItem>
                      <SelectItem value="webhook">🔗 Webhook (API externa)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editForm.action_type === 'delay' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Segundos de espera</Label>
                    <Input type="number" value={editForm.delay_seconds || 0} onChange={(e) => setEditForm({ ...editForm, delay_seconds: parseInt(e.target.value) })} />
                  </div>
                )}
                {editForm.action_type === 'add_tag' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Nome da tag</Label>
                    <Input value={editForm.tag || ''} onChange={(e) => setEditForm({ ...editForm, tag: e.target.value })} placeholder="Ex: lead_qualificado" />
                  </div>
                )}
                {editForm.action_type === 'send_media' && (
                  <div className="space-y-2">
                    <Label className="text-xs">URL da mídia</Label>
                    <Input value={editForm.media_url || ''} onChange={(e) => setEditForm({ ...editForm, media_url: e.target.value })} placeholder="https://exemplo.com/imagem.jpg" />
                    <Label className="text-xs">Tipo</Label>
                    <Select value={editForm.media_type || 'image'} onValueChange={(v) => setEditForm({ ...editForm, media_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Imagem</SelectItem>
                        <SelectItem value="document">Documento</SelectItem>
                        <SelectItem value="video">Vídeo</SelectItem>
                        <SelectItem value="audio">Áudio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {editForm.action_type === 'collect_data' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Campo para salvar no contato</Label>
                    <Select value={editForm.collect_field || 'name'} onValueChange={(v) => setEditForm({ ...editForm, collect_field: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Nome</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="notes">Observações</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-400">A próxima mensagem do contato será salva neste campo</p>
                  </div>
                )}
                {editForm.action_type === 'webhook' && (
                  <div className="space-y-2">
                    <Label className="text-xs">URL do Webhook (POST)</Label>
                    <Input value={editForm.webhook_url || ''} onChange={(e) => setEditForm({ ...editForm, webhook_url: e.target.value })} placeholder="https://seu-n8n.com/webhook/..." />
                    <p className="text-[10px] text-slate-400">Envia um POST com dados do contato e conversa. Compatível com n8n, Zapier, Make.</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs">Mensagem antes da ação (opcional)</Label>
                  <Textarea rows={2} value={editForm.message || ''} onChange={(e) => setEditForm({ ...editForm, message: e.target.value })} placeholder="Mensagem enviada antes de executar..." className="text-sm" />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSaveNode} className="flex-1 bg-[#F26522] hover:bg-[#d4561c] text-xs">
                Salvar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteNode} className="text-xs">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
