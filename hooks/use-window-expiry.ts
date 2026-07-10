'use client'

import { useState, useEffect } from 'react'
import { WindowStatus } from '@/types'
import { getWindowStatus } from '@/lib/utils'

export function useWindowExpiry(lastMessageAt: string | null): WindowStatus {
  const [status, setStatus] = useState<WindowStatus>(() => getWindowStatus(lastMessageAt))

  useEffect(() => {
    setStatus(getWindowStatus(lastMessageAt))

    // Atualiza a cada minuto para detectar expiração
    const interval = setInterval(() => {
      setStatus(getWindowStatus(lastMessageAt))
    }, 60000)

    return () => clearInterval(interval)
  }, [lastMessageAt])

  return status
}
