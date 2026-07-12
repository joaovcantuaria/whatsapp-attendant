'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { MessageTemplate } from '@/types'

export function useTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .neq('status', 'deleted')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching templates:', error)
      return
    }

    setTemplates(data || [])
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return { templates, isLoading, refetch: fetchTemplates }
}
