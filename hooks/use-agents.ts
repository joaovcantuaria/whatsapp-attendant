'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useCompany } from '@/hooks/use-company'
import { Agent } from '@/types'

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const { company } = useCompany()

  const fetchAgents = useCallback(async () => {
    if (!company) {
      setIsLoading(false)
      return
    }

    // Buscar membros da empresa
    const { data: members } = await supabase
      .from('company_members')
      .select('user_id, role')
      .eq('company_id', company.id)
      .eq('is_active', true)

    if (!members || members.length === 0) {
      setAgents([])
      setIsLoading(false)
      return
    }

    const userIds = members.map(m => m.user_id)

    // Buscar agentes que são membros da empresa
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .in('id', userIds)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching agents:', error)
      setIsLoading(false)
      return
    }

    setAgents(data || [])
    setIsLoading(false)
  }, [supabase, company])

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
