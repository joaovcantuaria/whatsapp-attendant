'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Conversation } from '@/types'
import { ChatWindow } from '@/components/chat/chat-window'
import { ContactPanel } from '@/components/chat/contact-panel'
import { Skeleton } from '@/components/ui/skeleton'

export default function ConversationDetailPage() {
  const { id } = useParams()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchConversation = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*, contact:contacts(*), agent:agents(*)')
        .eq('id', id)
        .single()

      if (data) {
        setConversation(data)
      }
      setIsLoading(false)
    }

    fetchConversation()
  }, [id, supabase])

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 p-4">
          <Skeleton className="h-full" />
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Conversa não encontrada</p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex-1">
        <ChatWindow conversation={conversation} />
      </div>
      <div className="w-80 border-l hidden xl:block">
        <ContactPanel conversation={conversation} />
      </div>
    </div>
  )
}
