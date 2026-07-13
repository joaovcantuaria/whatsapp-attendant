'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useCompany } from '@/hooks/use-company'
import { QrCode, Wifi, WifiOff, Loader2, RefreshCw, Smartphone, Unplug } from 'lucide-react'

interface ConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_ready'
  qr: string | null
  phone: string | null
  name: string | null
  lastUpdated: number
}

export function WhatsAppQRSection() {
  const { company } = useCompany()
  const companyId = company?.id || ''
  const [connection, setConnection] = useState<ConnectionStatus>({
    status: 'disconnected',
    qr: null,
    phone: null,
    name: null,
    lastUpdated: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Fetch status on mount (check if already connected)
  useEffect(() => {
    if (companyId) fetchStatus()
  }, [companyId])

  // Poll for status updates when connecting
  useEffect(() => {
    if (connection.status === 'connecting' || connection.status === 'qr_ready') {
      pollRef.current = setInterval(fetchStatus, 3000)
    } else {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [connection.status])

  async function fetchStatus() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_WPP_SERVER_URL || 'https://whatsapp-attendant-production.up.railway.app'}/api/instance/status/${companyId}`, {
        headers: { 'x-api-key': process.env.NEXT_PUBLIC_WPP_API_KEY || '' },
      })
      if (res.ok) {
        const data = await res.json()
        setConnection(data)
        if (data.status === 'connected') {
          toast({ title: '✅ WhatsApp conectado!', description: `Número: ${data.phone}` })
        }
      }
    } catch {}
  }

  async function handleConnect() {
    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_WPP_SERVER_URL || 'https://whatsapp-attendant-production.up.railway.app'}/api/instance/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_WPP_API_KEY || '',
        },
        body: JSON.stringify({ instanceId: companyId }),
      })
      if (res.ok) {
        const data = await res.json()
        setConnection(prev => ({ ...prev, ...data }))
        // Start polling
        setTimeout(fetchStatus, 2000)
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Erro ao iniciar conexão', description: err.error || `Status: ${res.status}`, variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Erro ao conectar', description: e.message || 'Servidor indisponível', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDisconnect() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_WPP_SERVER_URL || 'https://whatsapp-attendant-production.up.railway.app'}/api/instance/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_WPP_API_KEY || '',
        },
        body: JSON.stringify({ instanceId: companyId }),
      })
      if (res.ok) {
        setConnection({ status: 'disconnected', qr: null, phone: null, name: null, lastUpdated: Date.now() })
        toast({ title: 'WhatsApp desconectado' })
      }
    } catch {
      toast({ title: 'Erro ao desconectar', variant: 'destructive' })
    }
  }

  const statusConfig = {
    disconnected: { label: 'Desconectado', color: 'bg-gray-100 text-gray-600', icon: WifiOff },
    connecting: { label: 'Conectando...', color: 'bg-yellow-100 text-yellow-700', icon: Loader2 },
    qr_ready: { label: 'Aguardando leitura', color: 'bg-blue-100 text-blue-700', icon: QrCode },
    connected: { label: 'Conectado', color: 'bg-green-100 text-green-700', icon: Wifi },
  }

  const currentStatus = statusConfig[connection.status]
  const StatusIcon = currentStatus.icon

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Conexão via QR Code
            </CardTitle>
            <CardDescription className="mt-1">
              Conecte um número WhatsApp pessoal ou comercial via leitura de QR Code
            </CardDescription>
          </div>
          <Badge className={`${currentStatus.color} text-xs`}>
            <StatusIcon className={`h-3 w-3 mr-1 ${connection.status === 'connecting' ? 'animate-spin' : ''}`} />
            {currentStatus.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connected state */}
        {connection.status === 'connected' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">
                  {connection.name || 'WhatsApp conectado'}
                </p>
                <p className="text-xs text-green-600">+{connection.phone}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="mt-3 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Unplug className="h-3.5 w-3.5 mr-1.5" />
              Desconectar
            </Button>
          </div>
        )}

        {/* QR Code display */}
        {(connection.status === 'qr_ready' || connection.status === 'connecting') && connection.qr && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={connection.qr} alt="QR Code" className="w-64 h-64" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Escaneie o QR Code</p>
              <p className="text-xs text-gray-500 mt-1">
                Abra o WhatsApp {'>'} Menu {'>'} Dispositivos conectados {'>'} Conectar
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchStatus} className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Atualizar QR
            </Button>
          </div>
        )}

        {/* Connecting without QR yet */}
        {connection.status === 'connecting' && !connection.qr && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 text-[#F26522] animate-spin" />
            <p className="text-sm text-gray-500">Gerando QR Code...</p>
          </div>
        )}

        {/* Disconnected state */}
        {connection.status === 'disconnected' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <QrCode className="h-8 w-8 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Nenhum número conectado</p>
              <p className="text-xs text-gray-500 mt-1">
                Conecte seu WhatsApp via QR Code para receber mensagens
              </p>
            </div>
            <Button onClick={handleConnect} disabled={isLoading || !companyId} className="bg-[#F26522] hover:bg-[#d4561c]">
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Iniciando...</>
              ) : (
                <><QrCode className="h-4 w-4 mr-2" /> Gerar QR Code</>
              )}
            </Button>
          </div>
        )}

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800">
            <strong>⚠️ Atenção:</strong> A conexão via QR Code usa uma sessão do WhatsApp Web.
            Para estabilidade em produção e envios em massa, recomendamos a API Oficial da Meta.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
