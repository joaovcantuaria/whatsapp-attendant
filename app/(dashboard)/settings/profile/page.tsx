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
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')

  // Buscar dados do perfil diretamente da API
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
      <div className="p-6 space-y-6 h-full overflow-y-auto max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Configure suas informações de atendente</p>
        </div>
      </div>

      {/* Info básica */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(name || 'A')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{email}</p>
              <p className="text-sm text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">
              Este nome será usado na mensagem de apresentação ao cliente
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mensagem de apresentação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagem de Apresentação
          </CardTitle>
          <CardDescription>
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
            <p className="text-xs text-muted-foreground">
              Deixe em branco para usar a mensagem padrão (usa só o primeiro nome)
            </p>
          </div>

          {/* Preview */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Preview:</p>
            <p className="text-sm">{greetingMessage || defaultGreeting}</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? 'Salvando...' : 'Salvar Perfil'}
      </Button>
    </div>
  )
}
