'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LOGO_BASE64 } from '@/lib/logo-base64'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })

      if (error) {
        toast({ title: 'Erro no cadastro', description: error.message, variant: 'destructive' })
        return
      }

      if (!data.user) {
        toast({ title: 'Erro', description: 'Não foi possível criar a conta', variant: 'destructive' })
        return
      }

      const companyResponse = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          email,
          userId: data.user.id,
          userName: name,
        }),
      })

      if (!companyResponse.ok) {
        const err = await companyResponse.json()
        toast({ title: 'Erro ao criar empresa', description: err.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Conta criada com sucesso!', description: 'Redirecionando para configuração...' })
      router.push('/onboarding')
      router.refresh()
    } catch {
      toast({ title: 'Erro inesperado', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_BASE64} alt="BoraGerir" style={{ height: '44px' }} className="mx-auto mb-2" />
          </Link>
          <p className="text-sm text-gray-400">Comece seu trial gratuito de 14 dias</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm text-gray-700">Nome da Empresa</Label>
              <Input
                id="companyName"
                placeholder="Minha Empresa Ltda"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="h-11 rounded-xl border-gray-200 focus:border-[#F26522] focus:ring-[#F26522]/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-gray-700">Seu nome</Label>
              <Input
                id="name"
                placeholder="João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 rounded-xl border-gray-200 focus:border-[#F26522] focus:ring-[#F26522]/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border-gray-200 focus:border-[#F26522] focus:ring-[#F26522]/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-gray-700">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="h-11 rounded-xl border-gray-200 focus:border-[#F26522] focus:ring-[#F26522]/20"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-[#F26522] hover:bg-[#d4561c] text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Criando conta...' : 'Criar conta e começar'}
            </Button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-4">
            Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>

        {/* Link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="text-[#F26522] font-medium hover:underline">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  )
}
