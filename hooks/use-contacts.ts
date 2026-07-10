'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Contact } from '@/types'

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchContacts = useCallback(async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching contacts:', error)
      return
    }

    setContacts(data || [])
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const createContact = async (contact: Partial<Contact>) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert(contact)
      .select()
      .single()

    if (error) throw error
    setContacts((prev) => [...prev, data])
    return data
  }

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    const { data, error } = await supabase
      .from('contacts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setContacts((prev) => prev.map((c) => (c.id === id ? data : c)))
    return data
  }

  return { contacts, isLoading, createContact, updateContact, refetch: fetchContacts }
}
