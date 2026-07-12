'use client'

import { Conversation } from '@/types'
import { useConversationStore } from '@/store/conversation-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, formatRelativeTime, getInitials, truncateText } from '@/lib/utils'

interface ConversationItemProps {
  conversation: Conversation
}

const statusConfig: Record<string, { dot: string; label: string }> = {
  pending: { dot: 'bg-yellow-500', label: 'Pendente' },
  open: { dot: 'bg-green-500', label: 'Em atendimento' },
  closed: { dot: 'bg-slate-400', label: 'Encerrada' },
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const { selectedConversation, setSelectedConversation } = useConversationStore()
  const isSelected = selectedConversation?.id === conversation.id
  const contact = conversation.contact
  const agent = (conversation as any).agent
  const protocol = (conversation as any).protocol
  const status = statusConfig[conversation.status] || statusConfig.pending

  return (
    <button
      onClick={() => setSelectedConversation(conversation)}
      className={cn(
        'w-full px-3 py-2.5 flex gap-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-100',
        isSelected && 'bg-orange-50 border-l-2 border-l-orange-500'
      )}
    >
      {/* Avatar with agent color indicator */}
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={contact?.profile_picture || ''} />
          <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
            {contact?.name ? getInitials(contact.name) : '?'}
          </AvatarFallback>
        </Avatar>
        {/* Status dot */}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${status.dot}`} />
        {/* Agent color indicator */}
        {agent?.color && conversation.status === 'open' && (
          <span
            className="absolute -top-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-white"
            style={{ backgroundColor: agent.color }}
            title={agent.name}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-[13px] text-slate-800 truncate">
              {contact?.name || contact?.phone || 'Desconhecido'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
            {conversation.last_message_at
              ? formatRelativeTime(conversation.last_message_at)
              : ''}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[11px] text-slate-500 truncate">
            {conversation.last_message
              ? truncateText(conversation.last_message, 35)
              : 'Sem mensagens'}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {protocol && (
              <span className="text-[8px] text-slate-400 font-mono">{protocol}</span>
            )}
            {conversation.unread_count > 0 && (
              <span className="h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] font-bold text-white bg-orange-500 rounded-full">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
