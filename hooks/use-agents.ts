'use client'

import { useEffect, useState, useCallback } from 'react'
import { Agent } from '@/types'

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/agents')
      if (response.ok) {
        const data = await response.json()
        setAgents(data || [])
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  return { agents, isLoading, refetch: fetchAgents }
}
