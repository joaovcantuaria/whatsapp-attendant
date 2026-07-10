'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Agent } from '@/types'

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchAgents = useCallback(async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching agents:', error)
      return
    }

    setAgents(data || [])
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchAgents()

    const channel = supabase
      .channel('agents-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => {
          fetchAgents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAgents, supabase])

  return { agents, isLoading, refetch: fetchAgents }
}
