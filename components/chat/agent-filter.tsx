'use client'

import { useAgents } from '@/hooks/use-agents'
import { useConversationStore } from '@/store/conversation-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users } from 'lucide-react'

export function AgentFilter() {
  const { agents } = useAgents()
  const { agentFilter, setAgentFilter } = useConversationStore()

  return (
    <Select value={agentFilter} onValueChange={setAgentFilter}>
      <SelectTrigger className="h-8 text-xs">
        <Users className="h-3 w-3 mr-1" />
        <SelectValue placeholder="Todos os agentes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os agentes</SelectItem>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
