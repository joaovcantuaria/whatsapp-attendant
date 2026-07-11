'use client'

import { useState } from 'react'
import { useCompany } from '@/hooks/use-company'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { Wifi, WifiOff, Copy, Loader2, Check } from 'lucide-react'

export default function WhatsAppSettingsPage() {
  const { company, refetch } = useCompany()
  const { toast } = useToast()

  const [credentials, setCredentials] = useState({
    accessToken: '',
    phoneNumberId: company?.whatsapp_phone_number_id || '',
    businessAccountId: company?.whatsapp_business_account_id || '',
  })
  const [isTesting, setIsTesting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Mensagens automáticas
  const [welcomeEnabled, setWelcomeEnabled] = useState(company?.welcome_message_enabled || false)
  const [welcomeMessage, setWelcomeMessage] = useState(company?.welcome_message || '')
  const [awayEnabled, setAwayEnabled] = useState(company?.away_message_enabled || false)
  const [awayMessage, setAwayMessage] = useState(company?.away_message || '')

  const webhookUrl = company?.webhook_url || `https://whatsapp-attendant-lemon.vercel.app/api/webhook/${company?.slug || ''}`
  const verifyToken = `${company?.slug || ''}_${process.env.NEXT_PUBLIC_WEBHOOK_SECRET || 'WEBHOOK_SECRET'}`

  const handleTestConnection = async () => {
    if (!company) {
      toast({ title: 'Erro', description: 'Dados da empresa não carregados. Recarregue a página.', variant: 'destructive' })
      return
    }
    setIsTesting(true)

    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          accessToken: credentials.accessToken,
          phoneNumberId: credentials.phoneNumberId,
          businessAccountId: credentials.businessAccountId,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Conexão bem-sucedida!', description: `Número: ${data.phoneNumber}` })
        await refetch()
      } else {
        toast({ title: 'Falha na conexão', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    } finally {
      setIsTesting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!company) return
    setIsDisconnecting(true)

    try {
      await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id }),
      })
      toast({ title: 'WhatsApp desconectado' })
      await refetch()
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleSaveMessages = async () => {
    if (!company) return

    const response = await fetch('/api/companies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: company.id,
        welcome_message_enabled: welcomeEnabled,
        welcome_message: welcomeMessage,
        away_message_enabled: awayEnabled,
        away_message: awayMessage,
      }),
    })

    if (response.ok) {
      toast({ title: 'Configurações salvas' })
      await refetch()
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copiado!` })
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Configurações WhatsApp</h1>

      {/* Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Status da Conexão</CardTitle>
            <Badge variant={company?.whatsapp_connected ? 'success' : 'destructive'} className="flex items-center gap-1">
              {company?.whatsapp_connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {company?.whatsapp_connected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
        </CardHeader>
        {company?.whatsapp_connected && (
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Phone Number ID: {company.whatsapp_phone_number_id}
            </p>
            <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={isDisconnecting}>
              {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Desconectar
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Credenciais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {company?.whatsapp_connected ? 'Atualizar Credenciais' : 'Conectar WhatsApp'}
          </CardTitle>
          <CardDescription>
            Credenciais da Meta Cloud API (developers.facebook.com)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Access Token</Label>
            <Input
              type="password"
              placeholder="EAAxxxxxxx..."
              value={credentials.accessToken}
              onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number ID</Label>
            <Input
              value={credentials.phoneNumberId}
              onChange={(e) => setCredentials({ ...credentials, phoneNumberId: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Business Account ID</Label>
            <Input
              value={credentials.businessAccountId}
              onChange={(e) => setCredentials({ ...credentials, businessAccountId: e.target.value })}
            />
          </div>
          <Button 
            onClick={handleTestConnection} 
            disabled={isTesting || !credentials.accessToken || !credentials.phoneNumberId || !credentials.businessAccountId}
          >
            {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Testar e Salvar
          </Button>
          {!company && (
            <p className="text-sm text-red-500 mt-2">
              Erro: dados da empresa não carregados. Recarregue a página.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Webhook</CardTitle>
          <CardDescription>Configure esta URL no painel da Meta para receber mensagens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Webhook</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl, 'URL')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Token de Verificação</Label>
            <div className="flex gap-2">
              <Input value={verifyToken} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(verifyToken, 'Token')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mensagens Automáticas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mensagens Automáticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Mensagem de Boas-vindas</Label>
              <Button
                size="sm"
                variant={welcomeEnabled ? 'default' : 'outline'}
                onClick={() => setWelcomeEnabled(!welcomeEnabled)}
              >
                {welcomeEnabled ? 'Ativada' : 'Desativada'}
              </Button>
            </div>
            {welcomeEnabled && (
              <Textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Olá! Bem-vindo ao nosso atendimento..."
              />
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Mensagem de Ausência</Label>
              <Button
                size="sm"
                variant={awayEnabled ? 'default' : 'outline'}
                onClick={() => setAwayEnabled(!awayEnabled)}
              >
                {awayEnabled ? 'Ativada' : 'Desativada'}
              </Button>
            </div>
            {awayEnabled && (
              <Textarea
                value={awayMessage}
                onChange={(e) => setAwayMessage(e.target.value)}
                placeholder="No momento estamos fora do horário de atendimento..."
              />
            )}
          </div>

          <Button onClick={handleSaveMessages} className="w-full">
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
