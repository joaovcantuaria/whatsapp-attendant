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

export function AgentFilter() {
  const { agents } = useAgents()
  const { agentFilter, setAgentFilter } = useConversationStore()

  return (
    <Select value={agentFilter} onValueChange={setAgentFilter}>
      <SelectTrigger className="h-8 text-[11px] border-slate-200 bg-slate-50">
        <SelectValue placeholder="Todos os agentes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">Todos os agentes</SelectItem>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id} className="text-xs">
            {agent.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
