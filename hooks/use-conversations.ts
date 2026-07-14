'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Conversation, ConversationStatus } from '@/types'

export function useConversations(filter: ConversationStatus | 'all' = 'all') {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)

      const res = await fetch(`/api/conversations?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data || [])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchConversations()

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchConversations, supabase])

  return { conversations, isLoading, refetch: fetchConversations }
}
