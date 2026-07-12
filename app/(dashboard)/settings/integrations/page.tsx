'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Key, Copy, RefreshCw, Trash2, Plus, Code, Send, Clock } from 'lucide-react'
import { SettingsBack } from '@/components/shared/settings-back'

interface ApiKey {
  id: string
  name: string
  key: string
  is_active: boolean
  last_used_at: string | null
  requests_count: number
  created_at: string
}

export default function IntegrationsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/integrations')
      if (res.ok) setApiKeys(await res.json())
    } catch {} finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchKeys() }, [])

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'API Key Principal' }),
      })
      if (res.ok) {
        toast({ title: 'API Key criada!' })
        setNewKeyName('')
        fetchKeys()
      }
    } catch {
      toast({ title: 'Erro ao criar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta API Key? Integrações que usam ela vão parar de funcionar.')) return
    try {
      await fetch('/api/integrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      toast({ title: 'API Key excluída' })
      fetchKeys()
    } catch {}
  }

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    toast({ title: 'Copiado!' })
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chat.boragerir.com'

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        <SettingsBack />
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Integrações (API)</h1>
          <p className="text-xs text-slate-500">Conecte sistemas externos para enviar mensagens via WhatsApp</p>
        </div>

        {/* API Keys */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4 text-[#F26522]" />
              Chaves de API
            </CardTitle>
            <CardDescription className="text-xs">
              Use estas chaves para autenticar requisições de sistemas externos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create new */}
            <div className="flex gap-2">
              <Input
                placeholder="Nome da chave (ex: BoraGerir Empresas)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 h-9"
              />
              <Button size="sm" onClick={handleCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Criar Chave
              </Button>
            </div>

            {/* Existing keys */}
            {apiKeys.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nenhuma API Key criada</p>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{key.name}</span>
                        <Badge variant={key.is_active ? 'default' : 'secondary'} className={`text-[9px] ${key.is_active ? 'bg-green-100 text-green-700' : ''}`}>
                          {key.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-[11px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border truncate max-w-[280px]">
                          {key.key}
                        </code>
                        <button
                          onClick={() => copyToClipboard(key.key)}
                          className="text-slate-400 hover:text-[#F26522] transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                        <span>{key.requests_count} requisições</span>
                        {key.last_used_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            Último uso: {new Date(key.last_used_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(key.id)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentação */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Code className="h-4 w-4 text-blue-600" />
              Como usar a API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* Endpoint */}
              <div className="p-3 bg-slate-900 rounded-lg">
                <p className="text-[10px] text-slate-400 mb-1">Endpoint:</p>
                <code className="text-sm text-green-400 font-mono">POST {baseUrl}/api/external/send</code>
              </div>

              {/* Headers */}
              <div className="p-3 bg-slate-900 rounded-lg">
                <p className="text-[10px] text-slate-400 mb-1">Headers:</p>
                <pre className="text-xs text-slate-200 font-mono">{`{
  "Content-Type": "application/json",
  "x-api-key": "SUA_API_KEY"
}`}</pre>
              </div>

              {/* Exemplo Template */}
              <div>
                <p className="text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Send className="h-3.5 w-3.5" />
                  Enviar Template (confirmação de agendamento)
                </p>
                <div className="p-3 bg-slate-900 rounded-lg">
                  <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap">{`{
  "phone": "5538999209694",
  "template": "confirmacao_agendamento",
  "language": "pt_BR",
  "variables": ["João", "15/07/2026", "14:00", "Salão BoraGerir"],
  "contact_name": "João Silva"
}`}</pre>
                </div>
              </div>

              {/* Exemplo Texto Livre */}
              <div>
                <p className="text-xs font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Send className="h-3.5 w-3.5" />
                  Enviar Texto Livre (janela 24h aberta)
                </p>
                <div className="p-3 bg-slate-900 rounded-lg">
                  <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap">{`{
  "phone": "5538999209694",
  "message": "Olá João! Lembrando do seu agendamento amanhã às 14h."
}`}</pre>
                </div>
              </div>

              {/* Resposta */}
              <div>
                <p className="text-xs font-medium text-slate-700 mb-2">Resposta de sucesso:</p>
                <div className="p-3 bg-slate-900 rounded-lg">
                  <pre className="text-xs text-slate-200 font-mono">{`{
  "success": true,
  "message_id": "wamid.xxxxx",
  "phone": "5538999209694",
  "type": "template"
}`}</pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
