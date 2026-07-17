'use client'

import { useEffect, useRef, useState } from 'react'
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
import { MoreVertical, UserPlus, XCircle, RotateCcw, Target, Clock, ArrowRightLeft, Bot, BotOff } from 'lucide-react'
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
  const [isContactTyping, setIsContactTyping] = useState(false)
  const [aiEnabled, setAiEnabled] = useState<boolean>((conversation as any).ai_enabled !== false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (conversation.unread_count > 0) {
      supabase.from('conversations').update({ unread_count: 0 }).eq('id', conversation.id).then()
    }
  }, [conversation.id, conversation.unread_count, supabase])

  // Listen for typing events via Supabase realtime
  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversation.id}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.isTyping) {
          setIsContactTyping(true)
          // Auto-clear after 3 seconds
          setTimeout(() => setIsContactTyping(false), 3000)
        } else {
          setIsContactTyping(false)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversation.id, supabase])

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

  const handleTransfer = async () => {
    // Buscar lista de agentes disponíveis
    try {
      const res = await fetch('/api/team-chat?action=members')
      if (!res.ok) { toast({ title: 'Erro ao buscar agentes', variant: 'destructive' }); return }
      const data = await res.json()
      const agents = (data.agents || []).filter((a: any) => a.id !== agent?.id)
      
      if (agents.length === 0) {
        toast({ title: 'Nenhum outro agente disponível', variant: 'destructive' })
        return
      }

      // Por simplicidade, transferir para o primeiro agente disponível que não é o atual
      // Em produção, isso seria um modal com seleção
      const targetName = prompt(`Transferir para qual atendente?\n\nDisponíveis:\n${agents.map((a: any, i: number) => `${i + 1}. ${a.name}`).join('\n')}\n\nDigite o número:`)
      if (!targetName) return

      const targetIndex = parseInt(targetName) - 1
      const target = agents[targetIndex]
      if (!target) { toast({ title: 'Agente inválido', variant: 'destructive' }); return }

      const response = await fetch('/api/conversations/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversation.id, targetAgentId: target.id }),
      })

      if (response.ok) {
        const updated = await response.json()
        setSelectedConversation(updated)
        toast({ title: `Conversa transferida para ${target.name}` })
      } else {
        toast({ title: 'Erro ao transferir', variant: 'destructive' })
      }
    } catch { toast({ title: 'Erro ao transferir', variant: 'destructive' }) }
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
            {isContactTyping && (
              <p className="text-[10px] text-green-600 font-medium animate-pulse">Digitando...</p>
            )}
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
          <Button
            size="sm"
            variant={aiEnabled ? 'outline' : 'default'}
            onClick={async () => {
              const newValue = !aiEnabled
              setAiEnabled(newValue)
              await supabase.from('conversations').update({ ai_enabled: newValue }).eq('id', conversation.id)
              toast({ title: newValue ? '🤖 IA ativada para esta conversa' : '🚫 IA desativada para esta conversa' })
            }}
            className={`h-7 text-[10px] px-2 ${aiEnabled ? 'text-green-600 border-green-200 hover:bg-green-50' : 'bg-slate-500 hover:bg-slate-600 text-white'}`}
            title={aiEnabled ? 'IA ativa — clique para desativar' : 'IA inativa — clique para ativar'}
          >
            {aiEnabled ? <Bot className="h-3 w-3 mr-1" /> : <BotOff className="h-3 w-3 mr-1" />}
            {aiEnabled ? 'IA' : 'IA off'}
          </Button>
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
              <DropdownMenuItem onClick={handleTransfer} className="text-xs">
                <ArrowRightLeft className="mr-2 h-3 w-3" /> Transferir
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
      <ScrollArea className="flex-1" style={{ background: '#efeae2 url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z\' fill=\'%23d4cfc6\' fill-opacity=\'0.15\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }}>
        <div className="p-4 max-w-3xl mx-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <Skeleton className="h-10 w-44 rounded-xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <div className="h-16 w-16 rounded-full bg-white/80 flex items-center justify-center mb-3 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500">Nenhuma mensagem ainda</p>
              <p className="text-xs text-slate-400 mt-0.5">Envie uma mensagem para iniciar</p>
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
