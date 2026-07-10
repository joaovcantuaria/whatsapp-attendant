'use client'

import { useState } from 'react'
import { Conversation } from '@/types'
import { useAgents } from '@/hooks/use-agents'
import { useAuthStore } from '@/store/auth-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { getInitials } from '@/lib/utils'
import { Circle } from 'lucide-react'

interface TransferModalProps {
  conversation: Conversation
  onClose: () => void
}

export function TransferModal({ conversation, onClose }: TransferModalProps) {
  const { agents } = useAgents()
  const { agent: currentAgent } = useAuthStore()
  const { toast } = useToast()
  const [isTransferring, setIsTransferring] = useState(false)

  const availableAgents = agents.filter((a) => a.id !== currentAgent?.id)

  const handleTransfer = async (agentId: string) => {
    setIsTransferring(true)

    try {
      const response = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: conversation.id,
          agent_id: agentId,
        }),
      })

      if (response.ok) {
        toast({ title: 'Conversa transferida com sucesso' })
        onClose()
      } else {
        throw new Error()
      }
    } catch {
      toast({ title: 'Erro ao transferir', variant: 'destructive' })
    } finally {
      setIsTransferring(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir Conversa</DialogTitle>
          <DialogDescription>
            Selecione o agente que receberá esta conversa
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-64">
          {availableAgents.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum outro agente disponível
            </p>
          ) : (
            <div className="space-y-2">
              {availableAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleTransfer(agent.id)}
                  disabled={isTransferring}
                  className="w-full p-3 border rounded-lg flex items-center gap-3 hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                    </Avatar>
                    <Circle
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${
                        agent.is_online ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'
                      }`}
                    />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-sm">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.email}</p>
                  </div>
                  <Badge variant={agent.is_online ? 'success' : 'secondary'}>
                    {agent.is_online ? 'Online' : 'Offline'}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
