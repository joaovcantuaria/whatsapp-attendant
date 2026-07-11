'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bot, Zap, MessageSquare, Brain, Settings2, ToggleLeft } from 'lucide-react'

export default function AiAgentPage() {
  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Agente de IA</h1>
            <p className="text-xs text-slate-500">
              Configure seu assistente inteligente para atendimento automático
            </p>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            <ToggleLeft className="h-3 w-3 mr-1" />
            Desativado
          </Badge>
        </div>

        {/* Status Card */}
        <Card className="border-0 shadow-sm bg-white border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-sm font-semibold mb-2">Agente IA ainda não configurado</h3>
            <p className="text-xs text-slate-500 max-w-md mb-6">
              O agente de IA pode responder automaticamente seus clientes,
              qualificar leads e realizar atendimentos como um humano real.
            </p>
            <Button disabled size="sm">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Em breve
            </Button>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <MessageSquare className="h-4 w-4 text-blue-500 mb-2" />
              <p className="text-sm font-medium mb-1">Respostas Naturais</p>
              <p className="text-xs text-slate-500">
                Conversa como um humano real, entendendo contexto e intenção do cliente
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <Brain className="h-4 w-4 text-purple-500 mb-2" />
              <p className="text-sm font-medium mb-1">Qualificação de Leads</p>
              <p className="text-xs text-slate-500">
                Identifica automaticamente o estágio do lead e move no CRM
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <Settings2 className="h-4 w-4 text-green-500 mb-2" />
              <p className="text-sm font-medium mb-1">Personalização Total</p>
              <p className="text-xs text-slate-500">
                Configure tom de voz, respostas padrão e quando transferir para humano
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
