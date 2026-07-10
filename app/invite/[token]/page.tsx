'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { MessageCircle, Loader2 } from 'lucide-react'

export default function InvitePage() {
  const { token } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [needsRegistration, setNeedsRegistration] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    checkAuth()
  }, [supabase])

  const handleAccept = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        toast({ title: 'Convite aceito! Bem-vindo à equipe.' })
        router.push('/conversations')
      } else {
        const data = await response.json()
        toast({ title: 'Erro', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao aceitar convite', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })

      if (error) {
        toast({ title: 'Erro no cadastro', description: error.message, variant: 'destructive' })
        return
      }

      // Aceitar convite
      await handleAccept()
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-[#25D366] flex items-center justify-center">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle>Convite para Atendimento</CardTitle>
          <CardDescription>
            Você foi convidado para fazer parte de uma equipe de atendimento via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoggedIn ? (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Clique abaixo para aceitar o convite e entrar na equipe.
              </p>
              <Button onClick={handleAccept} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Aceitar Convite
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRegisterAndAccept} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Crie sua conta para aceitar o convite:
              </p>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar conta e aceitar
              </Button>
              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/login?redirect=/invite/${token}`)}>
                  Já tenho conta, fazer login
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
