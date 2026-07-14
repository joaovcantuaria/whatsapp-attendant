'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { SettingsBack } from '@/components/shared/settings-back'
import { Instagram, Wifi, WifiOff, ExternalLink, Save, Loader2 } from 'lucide-react'

export default function InstagramSettingsPage() {
  const [config, setConfig] = useState({
    accessToken: '',
    pageId: '',
  })
  const [isConnected, setIsConnected] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const res = await fetch('/api/instagram/config')
      if (res.ok) {
        const data = await res.json()
        setConfig({
          accessToken: data.instagram_access_token ? '••••••••••••' : '',
          pageId: data.instagram_page_id || '',
        })
        setIsConnected(!!data.instagram_access_token && !!data.instagram_page_id)
      }
    } catch {} finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    if (!config.accessToken || !config.pageId) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/instagram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagram_access_token: config.accessToken.includes('•') ? undefined : config.accessToken,
          instagram_page_id: config.pageId,
        }),
      })

      if (res.ok) {
        toast({ title: '✅ Instagram conectado!' })
        setIsConnected(true)
      } else {
        const err = await res.json()
        toast({ title: 'Erro', description: err.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDisconnect() {
    try {
      const res = await fetch('/api/instagram/config', {
        method: 'DELETE',
      })
      if (res.ok) {
        setIsConnected(false)
        setConfig({ accessToken: '', pageId: '' })
        toast({ title: 'Instagram desconectado' })
      }
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-5">
        <SettingsBack />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
            <Instagram className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Instagram Direct</h1>
            <p className="text-xs text-slate-500">Receba e responda mensagens do Direct no painel</p>
          </div>
        </div>

        {/* Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Status da Conexão</CardTitle>
              <Badge variant={isConnected ? 'default' : 'secondary'} className="text-[10px]">
                {isConnected ? <><Wifi className="h-3 w-3 mr-1" /> Conectado</> : <><WifiOff className="h-3 w-3 mr-1" /> Desconectado</>}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Configuração</CardTitle>
            <CardDescription className="text-xs">
              Configure as credenciais da API do Instagram (Meta Graph API)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Instagram Page ID</Label>
              <Input
                placeholder="ID da página Instagram Business"
                value={config.pageId}
                onChange={(e) => setConfig({ ...config, pageId: e.target.value })}
                className="text-sm"
              />
              <p className="text-[10px] text-slate-400">
                Encontre em: Meta Business Suite → Configurações → Informações da Página
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Access Token</Label>
              <Input
                placeholder="Token de acesso da Graph API"
                value={config.accessToken}
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                type="password"
                className="text-sm"
              />
              <p className="text-[10px] text-slate-400">
                Gere em: developers.facebook.com → Seu App → Instagram → Gerar Token
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving} className="bg-[#F26522] hover:bg-[#d4561c]">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar e Conectar
              </Button>
              {isConnected && (
                <Button variant="outline" onClick={handleDisconnect} className="text-red-600 border-red-200">
                  Desconectar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Webhook info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Webhook</CardTitle>
            <CardDescription className="text-xs">
              Configure no Meta Developer Portal para receber mensagens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <Label className="text-[10px] text-slate-500">URL do Webhook</Label>
              <code className="block text-xs mt-1 text-slate-800 break-all">
                https://chat.boragerir.com/api/webhook/instagram
              </code>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <Label className="text-[10px] text-slate-500">Verify Token</Label>
              <code className="block text-xs mt-1 text-slate-800">
                (mesmo token do WhatsApp webhook)
              </code>
            </div>
            <a
              href="https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#F26522] hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Documentação da API
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
