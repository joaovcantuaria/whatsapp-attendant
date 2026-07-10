'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { QuickReply } from '@/types'

export function useQuickReplies() {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchQuickReplies = useCallback(async () => {
    const { data, error } = await supabase
      .from('quick_replies')
      .select('*')
      .order('title', { ascending: true })

    if (error) {
      console.error('Error fetching quick replies:', error)
      return
    }

    setQuickReplies(data || [])
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchQuickReplies()
  }, [fetchQuickReplies])

  const filterByQuery = (query: string) => {
    return quickReplies.filter(
      (qr) =>
        qr.title.toLowerCase().includes(query.toLowerCase()) ||
        qr.shortcut?.toLowerCase().includes(query.toLowerCase()) ||
        qr.content.toLowerCase().includes(query.toLowerCase())
    )
  }

  return { quickReplies, isLoading, filterByQuery, refetch: fetchQuickReplies }
}
