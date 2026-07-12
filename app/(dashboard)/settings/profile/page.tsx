'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, MessageSquare, Save } from 'lucide-react'
import { getInitials } from '@/lib/utils'

export default function ProfilePage() {
  const { agent, setAgent } = useAuthStore()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [greetingMessage, setGreetingMessage] = useState('')
  const [agentColor, setAgentColor] = useState('#F26522')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/agents/profile')
        if (response.ok) {
          const data = await response.json()
          setName(data.name || '')
          setGreetingMessage(data.greeting_message || '')
          setEmail(data.email || '')
          setRole(data.role || 'agent')
          setAgentColor(data.color || '#F26522')
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const response = await fetch('/api/agents/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          greeting_message: greetingMessage || null,
          color: agentColor,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAgent(data)
        toast({ title: 'Perfil atualizado!' })
      } else {
        const err = await response.json()
        toast({ title: 'Erro ao salvar', description: err.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const firstName = name.split(' ')[0] || 'Atendente'
  const defaultGreeting = `Olá! Meu nome é ${firstName} e estarei te atendendo. Como posso ajudar? 😊`

  if (isLoading) {
    return (
      <div className="p-6 space-y-5 h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Meu Perfil</h1>
          <p className="text-xs text-slate-500">Configure suas informações de atendente</p>
        </div>

        {/* Info básica */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-base bg-primary/10 text-primary">
                  {getInitials(name || 'A')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{email}</p>
                <p className="text-xs text-slate-500">
                  {role === 'admin' ? 'Administrador' : 'Agente'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome de exibição</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
              <p className="text-xs text-slate-500">
                Este nome será usado na mensagem de apresentação ao cliente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mensagem de apresentação */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Mensagem de Apresentação
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Mensagem enviada automaticamente quando você assume um atendimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mensagem personalizada (opcional)</Label>
              <Textarea
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                placeholder={defaultGreeting}
                rows={3}
              />
              <p className="text-xs text-slate-500">
                Deixe em branco para usar a mensagem padrão (usa só o primeiro nome)
              </p>
            </div>

            {/* Preview */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Preview:</p>
              <p className="text-sm">{greetingMessage || defaultGreeting}</p>
            </div>
          </CardContent>
        </Card>

        {/* Cor do Agente */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Minha Cor</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Aparece nas conversas para identificar quem está atendendo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: agentColor }} />
              <div className="flex gap-2 flex-wrap">
                {['#F26522', '#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#10B981', '#0EA5E9'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAgentColor(color)}
                    className={`w-7 h-7 rounded-full transition-transform ${agentColor === color ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={isSaving} size="sm" className="w-full">
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {isSaving ? 'Salvando...' : 'Salvar Perfil'}
        </Button>
      </div>
    </div>
  )
}
