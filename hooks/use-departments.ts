'use client'

import { useEffect, useState, useCallback } from 'react'

export interface Department {
  id: string
  name: string
  color: string
  is_default: boolean
  auto_assign: boolean
  member_ids: string[]
}

// Cache compartilhado: a lista de conversas e cada item usam a mesma requisição
let cache: Promise<Department[]> | null = null

function carregar(): Promise<Department[]> {
  if (!cache) {
    cache = fetch('/api/departments')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => d || [])
      .catch(() => {
        cache = null
        return []
      })
  }
  return cache
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchDepartments = useCallback(async () => {
    cache = null
    setDepartments(await carregar())
    setIsLoading(false)
  }, [])

  useEffect(() => {
    let ativo = true
    carregar().then((d) => {
      if (ativo) {
        setDepartments(d)
        setIsLoading(false)
      }
    })
    return () => { ativo = false }
  }, [])

  return { departments, isLoading, refetch: fetchDepartments }
}
