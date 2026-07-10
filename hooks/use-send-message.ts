'use client'

import { useState } from 'react'
import { Message, MessageType } from '@/types'

interface SendMessageParams {
  conversationId: string
  phone: string
  type: MessageType
  content?: string
  mediaUrl?: string
  mediaFilename?: string
  templateName?: string
  templateLanguage?: string
  templateComponents?: Record<string, unknown>[]
}

export function useSendMessage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async (params: SendMessageParams): Promise<Message | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao enviar mensagem')
      }

      const message = await response.json()
      return message
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { sendMessage, isLoading, error, clearError: () => setError(null) }
}
