'use client'

import { useEffect, useRef } from 'react'
import { Conversation } from '@/types'
import { useMessages } from '@/hooks/use-messages'
import { useWindowExpiry } from '@/hooks/use-window-expiry'
import { useAuthStore } from '@/store/auth-store'
import { createClient } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { WindowExpiryBanner } from './window-expiry-banner'
import { getInitials, formatPhone } from '@/lib/utils'
import { Phone, MoreVertical, UserPlus, XCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'

interface ChatWindowProps {
  conversation: Conversation
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const { messages, isLoading } = useMessages(conversation.id)
  const windowStatus = useWindowExpiry(conversation.last_message_at)
  const { agent } = useAuthStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const { toast } = useToast()
  const contact = conversation.contact

  // Scroll para baixo ao receber mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Marcar como lidas
  useEffect(() => {
    if (conversation.unread_count > 0) {
      supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversation.id)
        .then()
    }
  }, [conversation.id, conversation.unread_count, supabase])

  const handleAssign = async () => {
    if (!agent) return
    
    const response = await fetch('/api/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: conversation.id,
        agent_id: agent.id,
        status: 'open',
      }),
    })

    if (response.ok) {
      toast({ title: 'Conversa atribuída a você' })
    }
  }

  const handleClose = async () => {
    const response = await fetch('/api/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: conversation.id,
        status: 'closed',
      }),
    })

    if (response.ok) {
      toast({ title: 'Conversa encerrada' })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={contact?.profile_picture || ''} />
            <AvatarFallback>
              {contact?.name ? getInitials(contact.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">
              {contact?.name || 'Desconhecido'}
            </p>
            <p className="text-xs text-muted-foreground">
              {contact?.phone ? formatPhone(contact.phone) : ''}
            </p>
          </div>
          <Badge variant={conversation.status === 'open' ? 'success' : conversation.status === 'pending' ? 'warning' : 'secondary'}>
            {conversation.status === 'open' ? 'Aberta' : conversation.status === 'pending' ? 'Pendente' : 'Fechada'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {conversation.status === 'pending' && (
            <Button size="sm" onClick={handleAssign}>
              <UserPlus className="h-4 w-4 mr-1" />
              Assumir
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAssign}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assumir atendimento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleClose} className="text-destructive">
                <XCircle className="mr-2 h-4 w-4" />
                Encerrar conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Window Expiry Banner */}
      {windowStatus !== 'open' && (
        <WindowExpiryBanner status={windowStatus} />
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <Skeleton className="h-12 w-48 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <MessageInput
        conversation={conversation}
        windowStatus={windowStatus}
      />
    </div>
  )
}
