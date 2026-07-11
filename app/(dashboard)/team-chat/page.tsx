'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuthStore } from '@/store/auth-store'
import { useToast } from '@/components/ui/use-toast'
import { Send, MessagesSquare, Users } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface TeamMessage {
  id: string
  agent_id: string
  agent_name: string
  agent_avatar: string | null
  content: string
  created_at: string
}

export default function TeamChatPage() {
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [onlineAgents, setOnlineAgents] = useState<{ id: string; name: string; avatar: string | null }[]>([])
  const { agent } = useAuthStore()
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    fetchOnlineAgents()
    const interval = setInterval(() => {
      fetchMessages()
      fetchOnlineAgents()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/team-chat')
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching team messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOnlineAgents = async () => {
    try {
      const response = await fetch('/api/team-chat?action=online')
      if (response.ok) {
        const data = await response.json()
        setOnlineAgents(data.agents || [])
      }
    } catch {}
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
      const response = await fetch('/api/team-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      })

      if (!response.ok) {
        toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' })
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center gap-3">
          <MessagesSquare className="h-4 w-4 text-primary" />
          <h1 className="text-lg font-semibold text-slate-800">Chat da Equipe</h1>
          <Badge variant="secondary" className="text-[10px]">
            {onlineAgents.length} online
          </Badge>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Carregando...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessagesSquare className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
              <p className="text-xs text-slate-500">Comece uma conversa com sua equipe!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.agent_id === agent?.id
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={msg.agent_avatar || ''} />
                    <AvatarFallback className="text-xs">
                      {getInitials(msg.agent_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[70%] ${isMe ? 'text-right' : ''}`}>
                    <p className="text-xs text-slate-500 mb-1">
                      {isMe ? 'Você' : msg.agent_name} •{' '}
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <div
                      className={`inline-block px-3 py-2 rounded-lg text-sm ${
                        isMe
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
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
        <div className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Digite uma mensagem para a equipe..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Online Agents Sidebar */}
      <div className="w-64 border-l p-4 hidden lg:block">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-slate-700">Equipe Online</span>
        </div>
        <div className="space-y-3">
          {onlineAgents.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={a.avatar || ''} />
                  <AvatarFallback className="text-xs">
                    {getInitials(a.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              </div>
              <span className="text-sm">{a.name}</span>
            </div>
          ))}
          {onlineAgents.length === 0 && (
            <p className="text-xs text-slate-500">Ninguém online</p>
          )}
        </div>
      </div>
    </div>
  )
}
