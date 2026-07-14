'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/hooks/use-company'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Check, Building2, Wifi, Link2, Users, Copy, Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const { company, refetch } = useCompany()
  const router = useRouter()
  const { toast } = useToast()

  // Step 1 state
  const [companyData, setCompanyData] = useState({
    name: company?.name || '',
    document: company?.document || '',
    phone: company?.phone || '',
  })

  // Step 2 state
  const [whatsappData, setWhatsappData] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
  })
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionSuccess, setConnectionSuccess] = useState(false)

  // Step 4 state
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitedEmails, setInvitedEmails] = useState<string[]>([])

  const handleSaveCompanyData = async () => {
    if (!company) return
    const response = await fetch('/api/companies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: company.id, ...companyData }),
    })
    if (response.ok) {
      toast({ title: 'Dados salvos' })
      setStep(2)
      await refetch()
    }
  }

  const handleTestConnection = async () => {
    if (!company) return
    setIsTestingConnection(true)
    setConnectionSuccess(false)

    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          ...whatsappData,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setConnectionSuccess(true)
        toast({ title: 'WhatsApp conectado!', description: `Número: ${data.phoneNumber}` })
        await refetch()
      } else {
        toast({ title: 'Falha na conexão', description: data.error || data.details, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao testar conexão', variant: 'destructive' })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail) return
    const response = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: 'agent' }),
    })

    if (response.ok) {
      setInvitedEmails([...invitedEmails, inviteEmail])
      setInviteEmail('')
      toast({ title: 'Convite enviado!' })
    } else {
      const data = await response.json()
      toast({ title: 'Erro', description: data.error, variant: 'destructive' })
    }
  }

  const handleFinish = () => {
    router.push('/conversations')
  }

  const webhookUrl = company?.webhook_url || `https://chat.boragerir.com/api/webhook/${company?.slug || 'sua-empresa'}`
  const verifyToken = (company as any)?.webhook_verify_token || `${company?.slug || ''}_webhook`

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Configuração Inicial</h1>
        <p className="text-muted-foreground">Complete os passos abaixo para ativar sua conta</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
              ${step > s ? 'bg-green-500 text-white' : step === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && <div className={`h-0.5 w-8 ${step > s ? 'bg-green-500' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 - Dados da Empresa */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Dados da Empresa
            </CardTitle>
            <CardDescription>Informações básicas da sua empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input
                value={companyData.name}
                onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={companyData.document}
                onChange={(e) => setCompanyData({ ...companyData, document: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone de contato</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={companyData.phone}
                onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
              />
            </div>
            <Button onClick={handleSaveCompanyData} className="w-full">
              Próximo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2 - Conectar WhatsApp */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" /> Conectar WhatsApp
            </CardTitle>
            <CardDescription>
              Insira as credenciais da Meta Cloud API. Encontre-as em developers.facebook.com
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input
                type="password"
                placeholder="EAAxxxxxxx..."
                value={whatsappData.accessToken}
                onChange={(e) => setWhatsappData({ ...whatsappData, accessToken: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number ID</Label>
              <Input
                placeholder="123456789..."
                value={whatsappData.phoneNumberId}
                onChange={(e) => setWhatsappData({ ...whatsappData, phoneNumberId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Business Account ID</Label>
              <Input
                placeholder="123456789..."
                value={whatsappData.businessAccountId}
                onChange={(e) => setWhatsappData({ ...whatsappData, businessAccountId: e.target.value })}
              />
            </div>

            {connectionSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
                <Check className="h-4 w-4" /> WhatsApp conectado com sucesso!
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTestingConnection || !whatsappData.accessToken}
                className="flex-1"
              >
                {isTestingConnection ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Testar Conexão
              </Button>
              <Button onClick={() => setStep(3)} disabled={!connectionSuccess && !company?.whatsapp_connected}>
                Próximo
              </Button>
            </div>
            <Button variant="ghost" onClick={() => setStep(3)} className="w-full text-sm">
              Configurar depois
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3 - Configurar Webhook */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" /> Configurar Webhook
            </CardTitle>
            <CardDescription>
              Configure este webhook no painel Meta for Developers para receber mensagens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl)
                    toast({ title: 'URL copiada!' })
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Token de Verificação</Label>
              <div className="flex gap-2">
                <Input value={verifyToken} readOnly className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(verifyToken)
                    toast({ title: 'Token copiado!' })
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-medium">Como configurar:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Acesse developers.facebook.com e abra seu app</li>
                <li>Vá em WhatsApp → Configuração</li>
                <li>Em &quot;Webhook&quot;, clique em &quot;Editar&quot;</li>
                <li>Cole a URL do Webhook acima no campo &quot;URL de Callback&quot;</li>
                <li>Cole o Token de Verificação no campo &quot;Token de verificação&quot;</li>
                <li>Clique em &quot;Verificar e salvar&quot;</li>
                <li>Em &quot;Campos do webhook&quot;, marque &quot;messages&quot;</li>
              </ol>
            </div>

            <Button onClick={() => setStep(4)} className="w-full">
              Próximo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4 - Convidar Equipe */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Convidar Equipe
            </CardTitle>
            <CardDescription>
              Convide os atendentes que vão usar a plataforma (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="email@colega.com"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button onClick={handleInvite}>Convidar</Button>
            </div>

            {invitedEmails.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Convites enviados:</p>
                {invitedEmails.map((email) => (
                  <div key={email} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{email}</span>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleFinish} className="w-full" size="lg">
              Concluir e ir para o Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
