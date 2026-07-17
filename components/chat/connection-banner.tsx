'use client'

import { useState, useEffect } from 'react'
import { useCompany } from '@/hooks/use-company'
import { WifiOff, RefreshCw, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export function ConnectionBanner() {
  const { company } = useCompany()
  const [whatsappStatus, setWhatsappStatus] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  const instanceId = company?.id || 'default'

  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/whatsapp-server/instance/status/${instanceId}`)
        if (res.ok) {
          const data = await res.json()
          setWhatsappStatus(data.status)
        } else {
          setWhatsappStatus('offline')
        }
      } catch {
        setWhatsappStatus('offline')
      } finally {
        setChecking(false)
      }
    }

    checkStatus()
    // Verificar a cada 30 segundos
    interval = setInterval(checkStatus, 30000)

    return () => clearInterval(interval)
  }, [instanceId])

  // Não mostrar enquanto verifica ou se está conectado
  // Também não mostrar se tem API oficial configurada (whatsapp_token)
  if (checking) return null
  if (whatsappStatus === 'connected') return null

  // Se a empresa tem token da Meta (API oficial), não precisa de QR Code
  // Nesse caso, o banner não é relevante
  const hasOfficialApi = company?.whatsapp_token && company?.whatsapp_phone_number_id
  if (hasOfficialApi) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-amber-600" />
        <span className="text-xs font-medium text-amber-700">
          {whatsappStatus === 'offline'
            ? 'Servidor WhatsApp offline'
            : 'WhatsApp desconectado'}
        </span>
        <span className="text-[10px] text-amber-500">
          — Mensagens não serão recebidas até reconectar
        </span>
      </div>
      <Link
        href="/settings/qrcode"
        className="flex items-center gap-1 text-[10px] font-medium text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-md transition-colors"
      >
        <RefreshCw className="h-3 w-3" />
        Reconectar
        <ExternalLink className="h-2.5 w-2.5" />
      </Link>
    </div>
  )
}
