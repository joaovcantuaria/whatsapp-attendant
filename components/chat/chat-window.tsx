'use client'

import { useEffect, useRef } from 'react'
import { Conversation } from '@/types'
import { useMessages } from '@/hooks/use-messages'
import { useWindowExpiry } from '@/hooks/use-window-expiry'
import { useAuthStore } from '@/store/auth-store'
import { useConversationStore } from '@/store/conversation-store'
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
  const { setSelectedConversation } = useConversationStore()
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
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = agent?.id || session?.user?.id
      const agentName = agent?.name || session?.user?.user_metadata?.name || 'Atendente'
      
      if (!userId) {
        toast({ title: 'Erro: sessão não encontrada', variant: 'destructive' })
        return
      }
      
      // 1. Assumir a conversa
      const response = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: conversation.id,
          agent_id: userId,
          status: 'open',
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        setSelectedConversation(updated)
        toast({ title: 'Conversa atribuída a você' })

        // 2. Enviar mensagem automática de apresentação
        const firstName = agentName.split(' ')[0]
        const defaultGreeting = `Olá! Meu nome é ${firstName} e estarei te atendendo. Como posso ajudar? 😊`
        const greetingMessage = agent?.greeting_message || defaultGreeting
        
        const contactPhone = conversation.contact?.phone
        if (contactPhone) {
          await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: conversation.id,
              phone: contactPhone,
              content: greetingMessage,
              type: 'text',
            }),
          })
        }
      } else {
        const err = await response.json()
        toast({ title: 'Erro ao assumir', description: err.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro ao assumir conversa', variant: 'destructive' })
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
      const updated = await response.json()
      setSelectedConversation(updated)
      toast({ title: 'Conversa encerrada' })
    }
  }

  const handleReopen = async () => {
    const response = await fetch('/api/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: conversation.id,
        status: 'open',
      }),
    })

    if (response.ok) {
      const updated = await response.json()
      setSelectedConversation(updated)
      toast({ title: 'Conversa reaberta' })
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
          {(conversation.status === 'pending' || !conversation.agent_id) && (
            <Button size="sm" onClick={handleAssign} variant="default">
              <UserPlus className="h-4 w-4 mr-1" />
              Assumir
            </Button>
          )}
          {conversation.status !== 'closed' && (
            <Button size="sm" onClick={handleClose} variant="outline">
              <XCircle className="h-4 w-4 mr-1" />
              Encerrar
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
              <DropdownMenuItem onClick={handleReopen}>
                <Phone className="mr-2 h-4 w-4" />
                Reabrir conversa
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
