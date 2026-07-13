'use client'

import { Conversation } from '@/types'
import { useConversationStore } from '@/store/conversation-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, formatRelativeTime, getInitials, truncateText } from '@/lib/utils'
import { Clock, CheckCheck, AlertCircle, User } from 'lucide-react'

interface ConversationItemProps {
  conversation: Conversation
}

// Cores fixas por index para agentes (quando não tem cor definida)
const agentColors = [
  '#F26522', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899',
  '#F59E0B', '#06B6D4', '#EF4444', '#6366F1', '#14B8A6',
]

function getAgentColor(agent: any, index?: number): string {
  if (agent?.color) return agent.color
  if (agent?.id) {
    // Gera cor consistente baseada no ID do agente
    const hash = agent.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    return agentColors[hash % agentColors.length]
  }
  return agentColors[(index || 0) % agentColors.length]
}

const statusConfig: Record<string, { dot: string; label: string; icon: typeof Clock }> = {
  pending: { dot: 'bg-yellow-500', label: 'Pendente', icon: Clock },
  open: { dot: 'bg-green-500', label: 'Em atendimento', icon: CheckCheck },
  closed: { dot: 'bg-slate-400', label: 'Encerrada', icon: AlertCircle },
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const { selectedConversation, setSelectedConversation } = useConversationStore()
  const isSelected = selectedConversation?.id === conversation.id
  const contact = conversation.contact
  const agent = (conversation as any).agent
  const protocol = (conversation as any).protocol
  const status = statusConfig[conversation.status] || statusConfig.pending
  
  // Gerar cor do agente: usar agent object se disponível, senão usar agent_id
  const agent = (conversation as any).agent
  let agentColor: string | null = null
  if (agent) {
    agentColor = getAgentColor(agent)
  } else if (conversation.agent_id) {
    // Agent_id existe mas relação não veio (RLS ou join issue)
    const hash = conversation.agent_id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    agentColor = agentColors[hash % agentColors.length]
  }

  return (
    <button
      onClick={() => setSelectedConversation(conversation)}
      className={cn(
        'w-full px-3 py-2.5 flex gap-2.5 hover:bg-slate-50 transition-all text-left border-b border-slate-50 relative group',
        isSelected && 'bg-orange-50/80 hover:bg-orange-50'
      )}
    >
      {/* Agent color bar (left edge) */}
      {agentColor && (
        <div
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
          style={{ backgroundColor: agentColor }}
        />
      )}

      {/* Avatar with status */}
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={contact?.profile_picture || ''} />
          <AvatarFallback className="text-xs bg-slate-100 text-slate-600 font-medium">
            {contact?.name ? getInitials(contact.name) : '?'}
          </AvatarFallback>
        </Avatar>
        {/* Status dot */}
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${status.dot}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: name + time */}
        <div className="flex items-center justify-between">
          <span className={cn(
            'font-medium text-[13px] truncate',
            isSelected ? 'text-slate-900' : 'text-slate-800',
            conversation.unread_count > 0 && 'font-semibold'
          )}>
            {contact?.name || contact?.phone || 'Desconhecido'}
          </span>
          <span className={cn(
            'text-[10px] shrink-0 ml-2',
            conversation.unread_count > 0 ? 'text-[#F26522] font-medium' : 'text-slate-400'
          )}>
            {conversation.last_message_at
              ? formatRelativeTime(conversation.last_message_at)
              : ''}
          </span>
        </div>

        {/* Middle row: last message */}
        <div className="flex items-center gap-1 mt-0.5">
          {conversation.status === 'open' && (
            <CheckCheck className="h-3 w-3 text-blue-500 shrink-0" />
          )}
          <span className={cn(
            'text-[11px] truncate flex-1',
            conversation.unread_count > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'
          )}>
            {conversation.last_message
              ? truncateText(conversation.last_message, 35)
              : 'Sem mensagens'}
          </span>
        </div>

        {/* Bottom row: badges */}
        <div className="flex items-center gap-1.5 mt-1">
          {/* Agent badge */}
          {(agent || conversation.agent_id) && (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full text-white max-w-[90px] truncate"
              style={{ backgroundColor: agentColor || '#6B7280' }}
              title={agent?.name || 'Atendente'}
            >
              <User className="h-2 w-2 shrink-0" />
              {agent?.name?.split(' ')[0] || 'Atendente'}
            </span>
          )}

          {/* Status badge for pending */}
          {conversation.status === 'pending' && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              <Clock className="h-2 w-2" />
              Aguardando
            </span>
          )}

          {/* Protocol */}
          {protocol && (
            <span className="text-[9px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
              #{protocol}
            </span>
          )}

          {/* Unread badge */}
          {conversation.unread_count > 0 && (
            <span className="ml-auto h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] font-bold text-white bg-[#F26522] rounded-full shrink-0">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
