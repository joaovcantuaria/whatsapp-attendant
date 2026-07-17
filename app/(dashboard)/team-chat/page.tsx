'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuthStore } from '@/store/auth-store'
import { useToast } from '@/components/ui/use-toast'
import { Send, MessagesSquare, Users, MessageCircle, Hash } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface TeamMessage {
  id: string
  agent_id: string
  agent_name: string
  agent_avatar: string | null
  content: string
  created_at: string
}

interface TeamMember {
  id: string
  name: string
  avatar: string | null
  is_online?: boolean
}

type ChatTarget = { type: 'group' } | { type: 'dm'; agent: TeamMember }

export default function TeamChatPage() {
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [chatTarget, setChatTarget] = useState<ChatTarget>({ type: 'group' })
  const { agent } = useAuthStore()
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [chatTarget])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/team-chat?action=online')
      if (res.ok) {
        const data = await res.json()
        setMembers(data.agents || [])
      }
      // Also fetch all members (not just online)
      const allRes = await fetch('/api/team-chat?action=members')
      if (allRes.ok) {
        const allData = await allRes.json()
        if (allData.agents?.length > 0) {
          setMembers(allData.agents)
        }
      }
    } catch {}
  }

  const fetchMessages = async () => {
    try {
      let url = '/api/team-chat'
      if (chatTarget.type === 'dm') {
        url = `/api/team-chat/dm?targetId=${chatTarget.agent.id}`
      }
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !agent) return

    const tempMessage: TeamMessage = {
      id: Date.now().toString(),
      agent_id: agent.id,
      agent_name: agent.name,
      agent_avatar: agent.avatar_url,
      content: newMessage,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, tempMessage])
    setNewMessage('')

    try {
      let url = '/api/team-chat'
      let body: any = { content: newMessage }

      if (chatTarget.type === 'dm') {
        url = '/api/team-chat/dm'
        body.targetId = chatTarget.agent.id
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' })
    }
  }

  const chatTitle = chatTarget.type === 'group'
    ? 'Chat da Equipe'
    : chatTarget.agent.name

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar - Channels & Members */}
      <div className="w-64 border-r bg-slate-50 flex flex-col">
        {/* Group Channel */}
        <div className="p-3 border-b">
          <p className="text-[10px] font-semibold text-slate-400 uppercase px-2 mb-2">Canais</p>
          <button
            onClick={() => setChatTarget({ type: 'group' })}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              chatTarget.type === 'group'
                ? 'bg-white shadow-sm text-slate-800 font-medium'
                : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            <Hash className="h-4 w-4 text-slate-400" />
            <span>Geral</span>
          </button>
        </div>

        {/* Direct Messages */}
        <div className="p-3 flex-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-400 uppercase px-2 mb-2">
            Mensagens diretas
          </p>
          <div className="space-y-1">
            {members
              .filter((m) => m.id !== agent?.id)
              .map((member) => (
                <button
                  key={member.id}
                  onClick={() => setChatTarget({ type: 'dm', agent: member })}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    chatTarget.type === 'dm' && chatTarget.agent.id === member.id
                      ? 'bg-white shadow-sm text-slate-800 font-medium'
                      : 'text-slate-600 hover:bg-white/70'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={member.avatar || ''} />
                      <AvatarFallback className="text-[9px]">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    {member.is_online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-50" />
                    )}
                  </div>
                  <span className="truncate">{member.name}</span>
                </button>
              ))}
            {members.filter((m) => m.id !== agent?.id).length === 0 && (
              <p className="text-xs text-slate-400 px-3 py-2">Nenhum membro</p>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 border-b flex items-center gap-3 px-4">
          {chatTarget.type === 'group' ? (
            <>
              <Hash className="h-4 w-4 text-slate-400" />
              <h1 className="text-sm font-semibold text-slate-800">Geral</h1>
              <Badge variant="secondary" className="text-[10px]">
                {members.length} membros
              </Badge>
            </>
          ) : (
            <>
              <Avatar className="h-7 w-7">
                <AvatarImage src={chatTarget.agent.avatar || ''} />
                <AvatarFallback className="text-[9px]">
                  {getInitials(chatTarget.agent.name)}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-sm font-semibold text-slate-800">{chatTarget.agent.name}</h1>
              <Badge variant="secondary" className="text-[10px]">DM</Badge>
            </>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Carregando...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {chatTarget.type === 'group'
                  ? 'Comece uma conversa com sua equipe!'
                  : `Envie uma mensagem para ${chatTarget.agent.name}`}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.agent_id === agent?.id
              return (
                <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarImage src={msg.agent_avatar || ''} />
                    <AvatarFallback className="text-[9px]">
                      {getInitials(msg.agent_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[70%] ${isMe ? 'text-right' : ''}`}>
                    <p className="text-[10px] text-slate-400 mb-0.5">
                      {isMe ? 'Você' : msg.agent_name} •{' '}
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <div
                      className={`inline-block px-3 py-1.5 rounded-lg text-sm ${
                        isMe
                          ? 'bg-[#F26522] text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
            className="flex gap-2"
          >
            <Input
              placeholder={
                chatTarget.type === 'group'
                  ? 'Mensagem para a equipe...'
                  : `Mensagem para ${chatTarget.agent.name}...`
              }
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()} className="bg-[#F26522] hover:bg-[#d4561c]">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
