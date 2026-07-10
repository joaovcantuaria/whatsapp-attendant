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
import { Plus, UserPlus, Circle } from 'lucide-react'

export default function AgentsPage() {
  const { agents, isLoading, refetch } = useAgents()
  const { agent: currentAgent } = useAuthStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newAgent, setNewAgent] = useState({ name: '', email: '', role: 'agent' })
  const { toast } = useToast()

  const isAdmin = currentAgent?.role === 'admin'

  const handleCreate = async () => {
    if (!newAgent.name || !newAgent.email) {
      toast({ title: 'Nome e email são obrigatórios', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      })

      if (response.ok) {
        toast({ title: 'Convite enviado por email' })
        setShowCreateDialog(false)
        setNewAgent({ name: '', email: '', role: 'agent' })
        refetch()
      } else {
        const data = await response.json()
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Erro ao criar agente',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
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
        toast({ title: 'Role atualizada' })
        refetch()
      }
    } catch (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    }
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agentes</h1>
        {isAdmin && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar Agente
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                    </Avatar>
                    <Circle
                      className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 ${
                        agent.is_online ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{agent.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                  </div>
                  <Badge variant={agent.role === 'admin' ? 'default' : 'secondary'}>
                    {agent.role}
                  </Badge>
                </div>
                {isAdmin && agent.id !== currentAgent?.id && (
                  <div className="mt-3">
                    <Select
                      value={agent.role}
                      onValueChange={(v) => handleUpdateRole(agent.id, v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
              Um email de convite será enviado para o novo agente
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
              <Label>Role</Label>
              <Select value={newAgent.role} onValueChange={(v) => setNewAgent({ ...newAgent, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agente</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full">
              Enviar Convite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
