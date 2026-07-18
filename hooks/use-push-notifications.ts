'use client'

import { useEffect } from 'react'

const VAPID_PUBLIC_KEY = 'BI8NHA6QoyXqp4G5nB2kCWVkgHSpAX-S_yucVEsQaLZtRcPM5DNbdlQdNZMaQBD4A79TP9qAko-eH2tWYbmp32M'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  useEffect(() => {
    registerPushSubscription()
  }, [])
}

async function registerPushSubscription() {
  try {
    // Verificar suporte
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications não suportadas')
      return
    }

    // Esperar service worker estar pronto
    const registration = await navigator.serviceWorker.ready

    // Verificar se já tem subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Pedir permissão
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.log('Permissão de notificação negada')
        return
      }

      // Criar subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    // Enviar subscription para o servidor
    await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    })

    console.log('Push subscription registrada')
  } catch (error) {
    console.error('Erro ao registrar push:', error)
  }
}
