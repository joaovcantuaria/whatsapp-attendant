'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useConversationStore } from '@/store/conversation-store'

export function useDesktopNotifications() {
  const supabase = createClient()
  const { selectedConversation } = useConversationStore()
  const permissionRef = useRef<NotificationPermission>('default')

  useEffect(() => {
    // Solicitar permissão de notificação
    if ('Notification' in window) {
      permissionRef.current = Notification.permission
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          permissionRef.current = perm
        })
      }
    }

    const channel = supabase
      .channel('desktop-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'direction=eq.inbound' },
        (payload) => {
          const msg = payload.new as any
          // Não notificar se estiver olhando a conversa
          if (msg.conversation_id === selectedConversation?.id) return
          // Não notificar se o documento está visível
          if (document.visibilityState === 'visible') return

          if (permissionRef.current === 'granted') {
            const notification = new Notification('Nova mensagem - BoraGerir', {
              body: msg.content?.substring(0, 100) || 'Nova mensagem recebida',
              icon: '/icon-192.png',
              tag: msg.conversation_id, // Agrupa notificações da mesma conversa
            })

            notification.onclick = () => {
              window.focus()
              notification.close()
            }

            // Auto-fechar após 5 segundos
            setTimeout(() => notification.close(), 5000)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedConversation?.id])
}
