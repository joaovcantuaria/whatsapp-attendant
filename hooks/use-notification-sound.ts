'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useConversationStore } from '@/store/conversation-store'

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const supabase = createClient()
  const { selectedConversation } = useConversationStore()

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.volume = 0.5

    const channel = supabase
      .channel('new-messages-notification')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'direction=eq.inbound' },
        (payload) => {
          // Don't play if we're looking at that conversation
          if (payload.new.conversation_id === selectedConversation?.id) return
          audioRef.current?.play().catch(() => {})
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedConversation?.id])
}
