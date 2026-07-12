'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Bot,
  Brain,
  MessageSquare,
  Zap,
  Settings2,
  Power,
  Save,
  Activity,
  Clock,
  ArrowRightLeft,
} from 'lucide-react'
import { PROVIDER_MODELS } from '@/lib/ai-providers'

interface AiConfig {
  id: string
  is_active: boolean
  provider: string
  model: string
  api_key: string
  system_prompt: string
  greeting_message: string
  transfer_keywords: string[]
  max_messages_before_transfer: number
  active_hours_start: string
  active_hours_end: string
  active_days: number[]
  temperature: number
  max_tokens: number
  context_messages: number
}

interface AiLog {
  id: string
  user_message: string
  ai_response: string
  tokens_used: number
  response_time_ms: number
  transferred: boolean
  created_at: string
}

export default function AiAgentPage() {
  const [config, setConfig] = useState<AiConfig | null>(null)
  const [logs, setLogs] = useState<AiLog[]>([])
  const [stats, setStats] = useState({ totalMessages: 0, totalTransfers: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'config' | 'logs'>('config')
  const { toast } = useToast()

  const fetchData = async () => {
    try {
      const res = await fetch('/api/ai-agent')
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
        setLogs(data.logs || [])
        setStats(data.stats)
      }
    } catch {} finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    if (!config) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        toast({ title: 'Configurações salvas!' })
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: data.error || 'Erro ao salvar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleActive = async () => {
    if (!config) return
    const newState = !config.is_active

    if (newState && !config.api_key) {
      toast({ title: 'Configure a API Key primeiro', variant: 'destructive' })
      return
    }

    setConfig({ ...config, is_active: newState })
    try {
      await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newState }),
      })
      toast({ title: newState ? 'Agente IA ativado!' : 'Agente IA desativado' })
    } catch {}
  }

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Agente de IA</h1>
            <p className="text-xs text-slate-500">Atendimento automático inteligente — Groq, Gemini ou OpenAI</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={config?.is_active ? 'default' : 'outline'}
              size="sm"
              onClick={toggleActive}
              className={config?.is_active ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <Power className="h-3.5 w-3.5 mr-1.5" />
              {config?.is_active ? 'Ativo' : 'Desativado'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{stats.totalMessages}</p>
                <p className="text-[10px] text-slate-500">Mensagens IA</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <ArrowRightLeft className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{stats.totalTransfers}</p>
                <p className="text-[10px] text-slate-500">Transferências</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                <Activity className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">
                  {stats.totalMessages > 0 ? Math.round(((stats.totalMessages - stats.totalTransfers) / stats.totalMessages) * 100) : 0}%
                </p>
                <p className="text-[10px] text-slate-500">Resolvido por IA</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'config' ? 'border-[#F26522] text-[#F26522]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5 inline mr-1.5" />
            Configuração
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'logs' ? 'border-[#F26522] text-[#F26522]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Activity className="h-3.5 w-3.5 inline mr-1.5" />
            Histórico ({logs.length})
          </button>
        </div>

        {activeTab === 'config' && config && (
          <div className="space-y-5">
            {/* API Key */}
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#F26522]" />
                  Conexão com IA
                </h3>

                {/* Provider */}
                <div className="space-y-2">
                  <Label className="text-xs">Provedor de IA</Label>
                  <Select
                    value={config.provider || 'groq'}
                    onValueChange={(v) => {
                      const firstModel = PROVIDER_MODELS[v]?.models[0]?.value || ''
                      setConfig({ ...config, provider: v, model: firstModel })
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROVIDER_MODELS).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Modelo</Label>
                    <Select value={config.model} onValueChange={(v) => setConfig({ ...config, model: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(PROVIDER_MODELS[config.provider || 'groq']?.models || []).map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">
                      API Key ({config.provider === 'gemini' ? 'Google AI Studio' : config.provider === 'groq' ? 'Groq Console' : 'OpenAI'})
                    </Label>
                    <Input
                      type="password"
                      placeholder={config.provider === 'groq' ? 'gsk_...' : config.provider === 'gemini' ? 'AIza...' : 'sk-...'}
                      value={config.api_key || ''}
                      onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  {config.provider === 'groq' && 'Crie sua key em console.groq.com'}
                  {config.provider === 'gemini' && 'Crie sua key em aistudio.google.com/apikey'}
                  {config.provider === 'openai' && 'Crie sua key em platform.openai.com'}
                </p>
              </CardContent>
            </Card>

            {/* Comportamento */}
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  Comportamento
                </h3>
                <div className="space-y-2">
                  <Label className="text-xs">Prompt do Sistema (personalidade do agente)</Label>
                  <Textarea
                    rows={4}
                    value={config.system_prompt}
                    onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                    placeholder="Você é um assistente profissional..."
                    className="text-sm"
                  />
                  <p className="text-[10px] text-slate-400">
                    Defina como o agente deve se comportar, tom de voz, e informações sobre sua empresa.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Temperatura (criatividade)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.temperature}
                      onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Máx. tokens por resposta</Label>
                    <Input
                      type="number"
                      value={config.max_tokens}
                      onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Mensagens de contexto</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={config.context_messages}
                    onChange={(e) => setConfig({ ...config, context_messages: parseInt(e.target.value) })}
                  />
                  <p className="text-[10px] text-slate-400">Quantas mensagens anteriores enviar como contexto para a IA.</p>
                </div>
              </CardContent>
            </Card>

            {/* Transferência */}
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-orange-600" />
                  Transferência para Humano
                </h3>
                <div className="space-y-2">
                  <Label className="text-xs">Palavras-chave para transferir (separadas por vírgula)</Label>
                  <Input
                    value={config.transfer_keywords?.join(', ') || ''}
                    onChange={(e) => setConfig({ ...config, transfer_keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="humano, atendente, pessoa"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Máx. mensagens antes de transferir</Label>
                  <Input
                    type="number"
                    value={config.max_messages_before_transfer}
                    onChange={(e) => setConfig({ ...config, max_messages_before_transfer: parseInt(e.target.value) })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Horário */}
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Horário de Funcionamento
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Início</Label>
                    <Input
                      type="time"
                      value={config.active_hours_start}
                      onChange={(e) => setConfig({ ...config, active_hours_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Fim</Label>
                    <Input
                      type="time"
                      value={config.active_hours_end}
                      onChange={(e) => setConfig({ ...config, active_hours_end: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save */}
            <Button onClick={handleSave} disabled={isSaving} className="w-full bg-[#F26522] hover:bg-[#d4561c]">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-500">Nenhuma interação registrada ainda</p>
              </div>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className="border-0 shadow-sm bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {log.transferred ? (
                          <Badge variant="destructive" className="text-[9px]">Transferido</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] bg-green-100 text-green-700">Resolvido IA</Badge>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{log.tokens_used} tokens</span>
                        <span>{log.response_time_ms}ms</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-slate-500 mb-0.5">Cliente:</p>
                        <p className="text-xs text-slate-700">{log.user_message}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-orange-600 mb-0.5">IA:</p>
                        <p className="text-xs text-slate-700">{log.ai_response}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
