'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { MessageSquare, Users, Zap, Bot, BarChart3, Send } from 'lucide-react'

const features = [
  {
    icon: MessageSquare,
    title: 'Chat em tempo real',
    description: 'Atenda múltiplos clientes simultaneamente com interface intuitiva.',
  },
  {
    icon: Bot,
    title: 'Agente IA',
    description: 'Automatize o primeiro contato e direcione ao setor certo.',
  },
  {
    icon: Send,
    title: 'Disparos em massa',
    description: 'Envie campanhas segmentadas para toda sua base de contatos.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios detalhados',
    description: 'Acompanhe métricas de atendimento e performance da equipe.',
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast({
          title: 'Erro no login',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      if (data.user) {
        await supabase
          .from('agents')
          .update({ is_online: true })
          .eq('id', data.user.id)
      }

      router.push('/conversations')
      router.refresh()
    } catch {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        {/* Background animated elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#F26522]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-32 right-16 w-80 h-80 bg-[#F26522]/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Floating icons */}
        <div className="absolute top-16 right-20 opacity-20 animate-bounce" style={{ animationDuration: '3s' }}>
          <MessageSquare className="w-8 h-8 text-[#F26522]" />
        </div>
        <div className="absolute top-40 left-16 opacity-15 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
          <Users className="w-6 h-6 text-white" />
        </div>
        <div className="absolute bottom-40 left-24 opacity-20 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
          <Zap className="w-7 h-7 text-[#F26522]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full">
          {/* Logo */}
          <div className="mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F26522] rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">
                Bora<span className="text-[#F26522]">Gerir</span>
              </span>
            </div>
          </div>

          {/* Feature showcase */}
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-white leading-tight">
              Seja bem-vindo de volta!
            </h2>
            <p className="text-gray-400 text-lg">
              Entre com a sua conta
            </p>
          </div>

          {/* Animated features */}
          <div className="mt-12 space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              const isActive = index === activeFeature
              return (
                <div
                  key={index}
                  className={`flex items-start gap-4 p-4 rounded-2xl transition-all duration-500 ${
                    isActive
                      ? 'bg-white/10 border border-white/10 scale-[1.02]'
                      : 'opacity-50 scale-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
                    isActive ? 'bg-[#F26522]' : 'bg-white/10'
                  }`}>
                    <Icon className={`w-5 h-5 transition-colors duration-500 ${
                      isActive ? 'text-white' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold transition-colors duration-500 ${
                      isActive ? 'text-white' : 'text-gray-400'
                    }`}>{feature.title}</h3>
                    <p className={`text-sm transition-colors duration-500 ${
                      isActive ? 'text-gray-300' : 'text-gray-500'
                    }`}>{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Progress dots */}
          <div className="mt-8 flex gap-2">
            {features.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index === activeFeature ? 'w-8 bg-[#F26522]' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 bg-[#F26522] rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Bora<span className="text-[#F26522]">Gerir</span>
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Entrar</h1>
            <p className="text-gray-500">
              Acesse sua conta para gerenciar seus atendimentos
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-[#F26522] focus:ring-[#F26522]/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha
                </Label>
                <Link href="#" className="text-xs text-[#F26522] hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-[#F26522] focus:ring-[#F26522]/20 transition-all"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-[#F26522] hover:bg-[#d4561c] text-white font-semibold text-base shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 transition-all hover:-translate-y-0.5"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500">
              Novo no BoraGerir?{' '}
              <Link href="/register" className="text-[#F26522] font-semibold hover:underline">
                Crie sua conta
              </Link>
            </p>
          </div>

          {/* Trust badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
            <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
            <span>Plataforma segura com API Oficial da Meta</span>
          </div>
        </div>
      </div>
    </div>
  )
}
