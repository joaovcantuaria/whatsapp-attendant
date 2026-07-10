'use client'

import { Conversation } from '@/types'
import { useConversationStore } from '@/store/conversation-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeTime, getInitials, truncateText } from '@/lib/utils'

interface ConversationItemProps {
  conversation: Conversation
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const { selectedConversation, setSelectedConversation } = useConversationStore()
  const isSelected = selectedConversation?.id === conversation.id
  const contact = conversation.contact

  const statusColors = {
    pending: 'bg-yellow-500',
    open: 'bg-green-500',
    closed: 'bg-gray-400',
  }

  return (
    <button
      onClick={() => setSelectedConversation(conversation)}
      className={cn(
        'w-full p-3 flex gap-3 hover:bg-accent/50 transition-colors text-left',
        isSelected && 'bg-accent'
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={contact?.profile_picture || ''} />
          <AvatarFallback>
            {contact?.name ? getInitials(contact.name) : '?'}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
            statusColors[conversation.status]
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate">
            {contact?.name || contact?.phone || 'Desconhecido'}
          </span>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {conversation.last_message_at
              ? formatRelativeTime(conversation.last_message_at)
              : ''}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-muted-foreground truncate">
            {conversation.last_message
              ? truncateText(conversation.last_message, 40)
              : 'Sem mensagens'}
          </span>
          {conversation.unread_count > 0 && (
            <Badge className="ml-2 h-5 min-w-[20px] flex items-center justify-center text-[10px] shrink-0">
              {conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}
