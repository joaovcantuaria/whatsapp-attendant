'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Conversation, ConversationStatus } from '@/types'

export function useConversations(filter: ConversationStatus | 'all' = 'all') {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchConversations = useCallback(async () => {
    let query = supabase
      .from('conversations')
      .select('*, contact:contacts(*), agent:agents(*)')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(50)

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching conversations:', error)
      return
    }

    setConversations(data || [])
    setIsLoading(false)
  }, [filter, supabase])

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
