'use client'

import { Conversation } from '@/types'
import { useConversationStore } from '@/store/conversation-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, formatRelativeTime, getInitials, truncateText } from '@/lib/utils'

interface ConversationItemProps {
  conversation: Conversation
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const { selectedConversation, setSelectedConversation } = useConversationStore()
  const isSelected = selectedConversation?.id === conversation.id
  const contact = conversation.contact

  return (
    <button
      onClick={() => setSelectedConversation(conversation)}
      className={cn(
        'w-full px-3 py-2.5 flex gap-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-100',
        isSelected && 'bg-orange-50 border-l-2 border-l-orange-500'
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={contact?.profile_picture || ''} />
          <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
            {contact?.name ? getInitials(contact.name) : '?'}
          </AvatarFallback>
        </Avatar>
        {conversation.status === 'open' && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
        )}
        {conversation.status === 'pending' && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-yellow-500 border-2 border-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[13px] text-slate-800 truncate">
            {contact?.name || contact?.phone || 'Desconhecido'}
          </span>
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
          {conversation.unread_count > 0 && (
            <span className="ml-2 h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] font-bold text-white bg-orange-500 rounded-full shrink-0">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
