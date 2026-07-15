'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { MessageSquare, Lock, Check } from 'lucide-react'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    // Verificar se tem sessão (o callback já fez o exchange)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsReady(true)
      } else {
        // Tentar pegar da URL (hash fragment)
        const hash = window.location.hash
        if (hash) {
          const params = new URLSearchParams(hash.substring(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            setIsReady(true)
          }
        }
      }
    }
    checkSession()
  }, [supabase])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast({ title: 'Senha muito curta', description: 'Mínimo de 6 caracteres', variant: 'destructive' })
      return
    }

    if (password !== confirmPassword) {
      toast({ title: 'Senhas não conferem', variant: 'destructive' })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        toast({ title: 'Erro ao definir senha', description: error.message, variant: 'destructive' })
        return
      }

      toast({ title: 'Senha definida com sucesso!' })
      router.push('/conversations')
      router.refresh()
    } catch {
      toast({ title: 'Erro inesperado', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 bg-[#F26522] rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">
            Bora<span className="text-[#F26522]">Gerir</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-5 h-5 text-green-600" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Defina sua senha</h1>
            <p className="text-sm text-gray-500 mt-1">
              Você foi convidado para o BoraGerir Chat. Crie uma senha para acessar.
            </p>
          </div>

          {!isReady ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">Verificando convite...</p>
            </div>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-gray-600">
                  Nova senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-gray-600">
                  Confirmar senha
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                  className="h-10"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-[#F26522] hover:bg-[#d4561c] text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Salvando...' : (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Definir senha e entrar
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
