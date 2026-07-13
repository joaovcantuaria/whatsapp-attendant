'use client'

import { useState } from 'react'
import { useAgents } from '@/hooks/use-agents'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { getInitials } from '@/lib/utils'
import { UserPlus, Circle, Users, Mail, Shield, ShieldCheck, Palette } from 'lucide-react'

const AGENT_COLORS = [
  '#F26522', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899',
  '#F59E0B', '#06B6D4', '#EF4444', '#6366F1', '#14B8A6',
]

export default function AgentsPage() {
  const { agents, isLoading, refetch } = useAgents()
  const { agent: currentAgent } = useAuthStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newAgent, setNewAgent] = useState({ name: '', email: '', role: 'agent' })
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const handleCreate = async () => {
    if (!newAgent.name || !newAgent.email) {
      toast({ title: 'Nome e email são obrigatórios', variant: 'destructive' })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      })

      const data = await response.json()

      if (response.ok) {
        toast({ title: 'Convite enviado!', description: `Um email foi enviado para ${newAgent.email}` })
        setShowCreateDialog(false)
        setNewAgent({ name: '', email: '', role: 'agent' })
        refetch()
      } else {
        toast({ title: 'Erro', description: data.error || 'Não foi possível convidar', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro ao convidar agente', variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateRole = async (agentId: string, role: string) => {
    try {
      const response = await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agentId, role }),
      })

      if (response.ok) {
        toast({ title: 'Permissão atualizada' })
        refetch()
      } else {
        toast({ title: 'Erro ao atualizar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    }
  }

  const handleUpdateColor = async (agentId: string, color: string) => {
    try {
      const response = await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agentId, color }),
      })

      if (response.ok) {
        toast({ title: 'Cor atualizada' })
        refetch()
      } else {
        toast({ title: 'Erro ao atualizar cor', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao atualizar cor', variant: 'destructive' })
    }
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Agentes</h1>
          <p className="text-xs text-slate-500">Gerencie sua equipe de atendimento</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Convidar Agente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Circle className="h-3 w-3 text-green-500 fill-green-500" />
              <div>
                <p className="text-xl font-bold text-slate-800">{agents.filter(a => a.is_online).length}</p>
                <p className="text-[11px] text-slate-500">Online agora</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <div>
                <p className="text-xl font-bold text-slate-800">{agents.length}</p>
                <p className="text-[11px] text-slate-500">Total de agentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
              <div>
                <p className="text-xl font-bold text-slate-800">{agents.filter(a => a.role === 'admin').length}</p>
                <p className="text-[11px] text-slate-500">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium mb-1">Nenhum agente cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">Convide sua equipe para começar o atendimento</p>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar primeiro agente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(agent.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${
                        agent.is_online ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{agent.name}</p>
                      {agent.id === currentAgent?.id && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">Você</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {agent.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={agent.role === 'admin' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {agent.role === 'admin' ? (
                          <><Shield className="h-3 w-3 mr-0.5" /> Admin</>
                        ) : (
                          'Agente'
                        )}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {agent.is_online ? '🟢 Online' : '⚫ Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role select - only for other agents */}
                {agent.id !== currentAgent?.id && (
                  <div className="mt-3 pt-3 border-t">
                    <Select
                      value={agent.role}
                      onValueChange={(v) => handleUpdateRole(agent.id, v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="agent">Agente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Color picker */}
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Palette className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Cor do atendente:</span>
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {AGENT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleUpdateColor(agent.id, color)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                          (agent as any).color === color ? 'border-slate-800 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Agent Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Agente</DialogTitle>
            <DialogDescription>
              Um email de convite será enviado para o novo membro da equipe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Nome do agente"
                value={newAgent.name}
                onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="email@empresa.com"
                type="email"
                value={newAgent.email}
                onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissão</Label>
              <Select value={newAgent.role} onValueChange={(v) => setNewAgent({ ...newAgent, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agente — pode atender conversas</SelectItem>
                  <SelectItem value="admin">Admin — acesso total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={isCreating}>
              {isCreating ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
