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
import { proximoSeguro } from '@/lib/app-link-rotas'

const features = [
  {
    icon: MessageSquare,
    title: 'Chat em tempo real',
    description: 'Atenda múltiplos clientes simultaneamente.',
  },
  {
    icon: Bot,
    title: 'Agente IA',
    description: 'Automatize o primeiro contato e direcione ao setor certo.',
  },
  {
    icon: Send,
    title: 'Disparos em massa',
    description: 'Campanhas segmentadas para toda sua base.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios detalhados',
    description: 'Métricas de atendimento e performance da equipe.',
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)
  // Vindo do "Conectar com BoraGerir Chat": volta para /conectar-app depois do login
  const [proximo, setProximo] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setProximo(proximoSeguro(new URLSearchParams(window.location.search).get('next')))
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

      router.push(proximo || '/conversations')
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
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        {/* Background animated elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-48 h-48 bg-[#F26522]/8 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-32 right-16 w-56 h-56 bg-[#F26522]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Floating icons */}
        <div className="absolute top-20 right-16 opacity-15 animate-bounce" style={{ animationDuration: '3s' }}>
          <MessageSquare className="w-5 h-5 text-[#F26522]" />
        </div>
        <div className="absolute top-44 left-12 opacity-10 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
          <Users className="w-4 h-4 text-white" />
        </div>
        <div className="absolute bottom-36 left-20 opacity-15 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
          <Zap className="w-5 h-5 text-[#F26522]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-10 xl:px-14 w-full">
          {/* Logo */}
          <div className="mb-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#F26522] rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                Bora<span className="text-[#F26522]">Gerir</span>
              </span>
            </div>
          </div>

          {/* Feature showcase */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white leading-snug">
              Seja bem-vindo de volta!
            </h2>
            <p className="text-gray-400 text-sm">
              Entre com a sua conta
            </p>
          </div>

          {/* Animated features */}
          <div className="mt-10 space-y-2.5">
            {features.map((feature, index) => {
              const Icon = feature.icon
              const isActive = index === activeFeature
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-500 ${
                    isActive
                      ? 'bg-white/8 border border-white/10'
                      : 'opacity-40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
                    isActive ? 'bg-[#F26522]' : 'bg-white/10'
                  }`}>
                    <Icon className={`w-4 h-4 transition-colors duration-500 ${
                      isActive ? 'text-white' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-medium transition-colors duration-500 ${
                      isActive ? 'text-white' : 'text-gray-400'
                    }`}>{feature.title}</h3>
                    <p className={`text-xs transition-colors duration-500 ${
                      isActive ? 'text-gray-300' : 'text-gray-500'
                    }`}>{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Progress dots */}
          <div className="mt-6 flex gap-1.5">
            {features.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all duration-500 ${
                  index === activeFeature ? 'w-6 bg-[#F26522]' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#F26522] rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              Bora<span className="text-[#F26522]">Gerir</span>
            </span>
          </div>

          {/* Header */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Entrar</h1>
            <p className="text-sm text-gray-500">
              Acesse sua conta para gerenciar seus atendimentos
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-gray-600">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 rounded-lg border-gray-200 bg-gray-50/80 focus:bg-white focus:border-[#F26522] focus:ring-[#F26522]/20 transition-all text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-gray-600">
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
                className="h-10 rounded-lg border-gray-200 bg-gray-50/80 focus:bg-white focus:border-[#F26522] focus:ring-[#F26522]/20 transition-all text-sm"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 rounded-lg bg-[#F26522] hover:bg-[#d4561c] text-white font-medium text-sm shadow-md shadow-orange-100 hover:shadow-lg hover:shadow-orange-200 transition-all"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-7 pt-5 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500">
              Novo no BoraGerir?{' '}
              <Link href={proximo ? `/register?next=${encodeURIComponent(proximo)}` : '/register'} className="text-[#F26522] font-medium hover:underline">
                Crie sua conta
              </Link>
            </p>
          </div>

          {/* Trust badge */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <div className="w-3 h-3 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            </div>
            <span>Plataforma segura · API Oficial da Meta</span>
          </div>
        </div>
      </div>
    </div>
  )
}
