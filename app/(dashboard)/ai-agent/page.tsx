'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bot, Zap, MessageSquare, Brain, Settings2, ToggleLeft } from 'lucide-react'

export default function AiAgentPage() {
  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Agente de IA</h1>
            <p className="text-sm text-muted-foreground">
              Configure seu assistente inteligente para atendimento automático
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          <ToggleLeft className="h-3 w-3 mr-1" />
          Desativado
        </Badge>
      </div>

      {/* Status Card */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Brain className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Agente IA ainda não configurado</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            O agente de IA pode responder automaticamente seus clientes, 
            qualificar leads e realizar atendimentos como um humano real.
          </p>
          <Button disabled>
            <Zap className="h-4 w-4 mr-2" />
            Em breve
          </Button>
        </CardContent>
      </Card>

      {/* Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <MessageSquare className="h-8 w-8 text-blue-500 mb-2" />
            <CardTitle className="text-base">Respostas Naturais</CardTitle>
            <CardDescription>
              Conversa como um humano real, entendendo contexto e intenção do cliente
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Brain className="h-8 w-8 text-purple-500 mb-2" />
            <CardTitle className="text-base">Qualificação de Leads</CardTitle>
            <CardDescription>
              Identifica automaticamente o estágio do lead e move no CRM
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Settings2 className="h-8 w-8 text-green-500 mb-2" />
            <CardTitle className="text-base">Personalização Total</CardTitle>
            <CardDescription>
              Configure tom de voz, respostas padrão e quando transferir para humano
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
