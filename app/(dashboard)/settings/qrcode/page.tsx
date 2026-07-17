'use client'

import { useState, useEffect } from 'react'
import { useCompany } from '@/hooks/use-company'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { SettingsBack } from '@/components/shared/settings-back'
import { Smartphone, QrCode, Wifi, WifiOff, RefreshCw, Loader2, Unplug } from 'lucide-react'

const WHATSAPP_SERVER_URL = '/api/whatsapp-server'

export default function QRCodeSettingsPage() {
  const { company } = useCompany()
  const { toast } = useToast()
  const [status, setStatus] = useState<string>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [polling, setPolling] = useState(false)

  const instanceId = company?.id || 'default'

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${WHATSAPP_SERVER_URL}/instance/status/${instanceId}`)
      if (res.ok) {
        const data = await res.json()
        setStatus(data.status)
        setQrCode(data.qr || null)
        setPhone(data.phone || null)
        setName(data.name || null)
      }
    } catch {
      setStatus('offline')
    }
  }

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${WHATSAPP_SERVER_URL}/instance/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId }),
      })
      if (res.ok) {
        const data = await res.json()
        setStatus(data.status)
        setQrCode(data.qr || null)
        setPolling(true)
        toast({ title: 'Conectando... Escaneie o QR Code' })
      } else {
        toast({ title: 'Erro ao conectar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Servidor não acessível', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await fetch(`${WHATSAPP_SERVER_URL}/instance/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId }),
      })
      setStatus('disconnected')
      setQrCode(null)
      setPhone(null)
      setName(null)
      setPolling(false)
      toast({ title: 'Desconectado' })
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  // Polling para atualizar status/QR
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [instanceId])

  // Parar polling quando conectado
  useEffect(() => {
    if (status === 'connected') {
      setPolling(false)
    }
  }, [status])

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Wifi }> = {
    loading: { label: 'Verificando...', color: 'bg-slate-100 text-slate-500', icon: Loader2 },
    connected: { label: 'Conectado', color: 'bg-green-100 text-green-700', icon: Wifi },
    connecting: { label: 'Conectando...', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
    qr_ready: { label: 'Aguardando QR', color: 'bg-blue-100 text-blue-700', icon: QrCode },
    disconnected: { label: 'Desconectado', color: 'bg-gray-100 text-gray-700', icon: WifiOff },
    offline: { label: 'Servidor offline', color: 'bg-red-100 text-red-700', icon: WifiOff },
  }

  const config = statusConfig[status] || statusConfig.disconnected
  const StatusIcon = config.icon

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-5">
        <SettingsBack />
        <h1 className="text-lg font-semibold text-slate-800">Conexão via QR Code</h1>
        <p className="text-xs text-slate-500">
          Conecte um número de WhatsApp Business comum escaneando o QR Code. Não precisa de API oficial.
        </p>

        {/* Status Card */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Status da Conexão
              </div>
              <Badge className={`text-[10px] ${config.color}`}>
                <StatusIcon className={`h-3 w-3 mr-1 ${status === 'connecting' ? 'animate-spin' : ''}`} />
                {config.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === 'connected' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Wifi className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{name || 'WhatsApp conectado'}</p>
                    <p className="text-xs text-slate-500">+{phone}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect} className="text-red-600 hover:text-red-700">
                  <Unplug className="h-3.5 w-3.5 mr-1.5" />
                  Desconectar
                </Button>
              </div>
            )}

            {(status === 'qr_ready' || status === 'connecting') && qrCode && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-slate-600">Escaneie o QR Code com seu WhatsApp:</p>
                <div className="p-4 bg-white border-2 border-slate-200 rounded-xl">
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                </div>
                <p className="text-[10px] text-slate-400">WhatsApp → Menu (⋮) → Aparelhos conectados → Conectar aparelho</p>
              </div>
            )}

            {status === 'disconnected' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                  <QrCode className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">Nenhum WhatsApp conectado via QR Code</p>
                <Button onClick={handleConnect} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4 mr-2" />
                  )}
                  Gerar QR Code
                </Button>
              </div>
            )}

            {status === 'offline' && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
                  <WifiOff className="h-8 w-8 text-red-400" />
                </div>
                <p className="text-sm text-red-600">Servidor WhatsApp não está acessível</p>
                <p className="text-xs text-slate-400">Verifique se o servidor está rodando na VPS</p>
              </div>
            )}

            {status === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                <p className="text-sm text-slate-500">Verificando conexão...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2">
          <p className="text-xs font-medium text-blue-700">Como funciona:</p>
          <ul className="text-[11px] text-blue-600 space-y-1 list-disc pl-4">
            <li>Clique em "Gerar QR Code" e escaneie com o WhatsApp Business do celular</li>
            <li>As mensagens recebidas aparecem automaticamente nas Conversas</li>
            <li>Você pode enviar mensagens livremente sem templates ou janela de 24h</li>
            <li>A conexão é mantida 24/7 no servidor — não precisa deixar o celular ligado</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
