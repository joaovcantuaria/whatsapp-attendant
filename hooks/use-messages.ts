'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Message } from '@/types'

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Optimistic: adicionar mensagem localmente antes do servidor confirmar
  const addOptimisticMessage = useCallback((message: Partial<Message>) => {
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || '',
      content: message.content || '',
      sender_type: 'agent',
      message_type: 'text',
      created_at: new Date().toISOString(),
      ...message,
    } as Message
    setMessages((prev) => [...prev, optimistic])
  }, [conversationId])

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([])
      setIsLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return
    }

    // Filtrar mensagens vazias (sem conteúdo e sem mídia) - mas manter notas internas
    const filtered = (data || []).filter((msg: Message) => {
      // Sempre manter notas internas
      if (msg.direction === 'internal' || (msg.type as string) === 'internal_note') return true
      // Manter mensagens com conteúdo ou mídia ou tipo não-texto
      return msg.content || msg.media_url || msg.type !== 'text'
    })

    setMessages(filtered)
    setIsLoading(false)
  }, [conversationId, supabase])

  useEffect(() => {
    fetchMessages()

    if (!conversationId) return

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          // Ignorar mensagens vazias (sem conteúdo e sem mídia)
          if (newMsg.type === 'text' && !newMsg.content && !newMsg.media_url) return
          setMessages((prev) => {
            // Evitar duplicatas
            if (prev.some(m => m.id === newMsg.id)) return prev
            // Remover mensagem otimista correspondente
            const withoutOptimistic = prev.filter(m => !m.id.startsWith('temp-'))
            return [...withoutOptimistic, newMsg]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === (payload.new as Message).id ? (payload.new as Message) : msg
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, fetchMessages, supabase])

  return { messages, isLoading, refetch: fetchMessages, addOptimisticMessage }
}
