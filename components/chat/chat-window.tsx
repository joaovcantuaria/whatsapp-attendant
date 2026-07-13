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
import { MoreVertical, UserPlus, XCircle, RotateCcw, Target, Clock } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'

interface ChatWindowProps {
  conversation: Conversation
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const { messages, isLoading, addOptimisticMessage } = useMessages(conversation.id)
  const windowStatus = useWindowExpiry(conversation.last_message_at)
  const { agent } = useAuthStore()
  const { setSelectedConversation } = useConversationStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const { toast } = useToast()
  const contact = conversation.contact

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (conversation.unread_count > 0) {
      supabase.from('conversations').update({ unread_count: 0 }).eq('id', conversation.id).then()
    }
  }, [conversation.id, conversation.unread_count, supabase])

  const handleAssign = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = agent?.id || session?.user?.id
      if (!userId) { toast({ title: 'Erro: sessão não encontrada', variant: 'destructive' }); return }

      const profileRes = await fetch('/api/agents/profile')
      const agentProfile = profileRes.ok ? await profileRes.json() : null
      const agentName = agentProfile?.name || agent?.name || 'Atendente'
      const agentGreeting = agentProfile?.greeting_message || agent?.greeting_message || null

      const response = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conversation.id, agent_id: userId, status: 'open' }),
      })

      if (response.ok) {
        const updated = await response.json()
        setSelectedConversation(updated)
        toast({ title: 'Conversa assumida' })

        const firstName = agentName.split(' ')[0]
        const defaultGreeting = `Olá! Meu nome é ${firstName} e estarei te atendendo. Como posso ajudar? 😊`
        const greetingMessage = agentGreeting || defaultGreeting
        const contactPhone = conversation.contact?.phone
        if (contactPhone) {
          await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: conversation.id, phone: contactPhone, content: greetingMessage, type: 'text' }),
          })
        }
      }
    } catch { toast({ title: 'Erro ao assumir', variant: 'destructive' }) }
  }

  const handleClose = async () => {
    const response = await fetch('/api/conversations', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conversation.id, status: 'closed' }),
    })
    if (response.ok) { setSelectedConversation(await response.json()); toast({ title: 'Conversa encerrada' }) }
  }

  const handleReopen = async () => {
    const response = await fetch('/api/conversations', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conversation.id, status: 'open' }),
    })
    if (response.ok) { setSelectedConversation(await response.json()); toast({ title: 'Conversa reaberta' }) }
  }

  const handleSignalLead = async () => {
    try {
      // Buscar pipeline e primeiro stage
      const pipelineRes = await fetch('/api/crm/pipeline')
      if (!pipelineRes.ok) {
        toast({ title: 'Pipeline não configurado', description: 'Configure o CRM primeiro', variant: 'destructive' })
        return
      }
      const pipelineData = await pipelineRes.json()
      const firstStage = pipelineData.stages?.[0]

      if (!firstStage || !pipelineData.pipeline) {
        toast({ title: 'Pipeline não configurado', variant: 'destructive' })
        return
      }

      // Criar deal no CRM
      const response = await fetch('/api/crm/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Lead - ${contact?.name || contact?.phone || 'Contato'}`,
          value: 0,
          contact_id: contact?.id || null,
          stage_id: firstStage.id,
          pipeline_id: pipelineData.pipeline.id,
        }),
      })

      if (response.ok) {
        toast({ title: '🎯 Lead sinalizado!', description: 'Enviado para o pipeline do CRM' })
      } else {
        toast({ title: 'Erro ao sinalizar lead', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao sinalizar lead', variant: 'destructive' })
    }
  }

  const statusConfig = {
    open: { label: 'Aberta', color: 'bg-green-500' },
    pending: { label: 'Pendente', color: 'bg-yellow-500' },
    closed: { label: 'Fechada', color: 'bg-slate-400' },
  }
  const status = statusConfig[conversation.status] || statusConfig.open

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="h-12 border-b flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarImage src={contact?.profile_picture || ''} />
            <AvatarFallback className="text-[10px] bg-[#F26522]/10 text-[#F26522] font-semibold">
              {contact?.name ? getInitials(contact.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-slate-800">{contact?.name || 'Desconhecido'}</p>
              <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
              <span className="text-[10px] text-slate-400">{status.label}</span>
            </div>
            <p className="text-[10px] text-slate-400">{contact?.phone ? formatPhone(contact.phone) : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Pending: show assign + wait */}
          {(conversation.status === 'pending' || !conversation.agent_id) && (
            <>
              <Button size="sm" onClick={handleAssign} className="h-7 text-[10px] px-2.5 bg-[#F26522] hover:bg-[#d4561c]">
                <UserPlus className="h-3 w-3 mr-1" /> Atribuir
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2.5 text-slate-500">
                <Clock className="h-3 w-3 mr-1" /> Espera
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={handleSignalLead} className="h-7 text-[11px] px-2.5 text-orange-600 border-orange-200 hover:bg-orange-50">
            <Target className="h-3 w-3 mr-1" /> Lead
          </Button>
          {conversation.status !== 'closed' && (
            <Button size="sm" variant="ghost" onClick={handleClose} className="h-7 text-[11px] px-2.5 text-slate-500">
              <XCircle className="h-3 w-3 mr-1" /> Encerrar
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={handleAssign} className="text-xs">
                <UserPlus className="mr-2 h-3 w-3" /> Assumir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignalLead} className="text-xs text-orange-600">
                <Target className="mr-2 h-3 w-3" /> Sinalizar como Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReopen} className="text-xs">
                <RotateCcw className="mr-2 h-3 w-3" /> Reabrir
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClose} className="text-xs text-red-600">
                <XCircle className="mr-2 h-3 w-3" /> Encerrar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expiry Banner */}
      {windowStatus !== 'open' && <WindowExpiryBanner status={windowStatus} />}

      {/* Messages */}
      <ScrollArea className="flex-1 bg-slate-50">
        <div className="p-4 max-w-3xl mx-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <Skeleton className="h-10 w-44 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <MessageInput conversation={conversation} windowStatus={windowStatus} onOptimisticSend={addOptimisticMessage} />
    </div>
  )
}
