'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { MessageSquare, Star, Quote } from 'lucide-react'

const testimonials = [
  {
    quote: 'O BoraGerir revolucionou a forma como atendemos nossos clientes. Organizou todo o processo de suporte e atendimento comercial.',
    author: 'Carlos Mendes',
    role: 'CEO, Digital Solutions',
    rating: 5,
  },
  {
    quote: 'Conseguimos reduzir o tempo de resposta em 70% e aumentar as vendas pelo WhatsApp. Ferramenta indispensável.',
    author: 'Ana Paula Costa',
    role: 'Gerente Comercial, TechStore',
    rating: 5,
  },
  {
    quote: 'A automação com IA nos permitiu escalar o atendimento sem aumentar a equipe. ROI incrível no primeiro mês.',
    author: 'Roberto Silva',
    role: 'Diretor de Operações, FastDelivery',
    rating: 5,
  },
]

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

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
    <div className="min-h-screen flex">
      {/* Left Panel - Testimonials */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-32 left-20 w-72 h-72 bg-[#F26522]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#F26522]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full">
          {/* Logo */}
          <div className="mb-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F26522] rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">
                Bora<span className="text-[#F26522]">Gerir</span>
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            <div>
              <p className="text-3xl font-bold text-white">500+</p>
              <p className="text-sm text-gray-400">Empresas ativas</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">2M+</p>
              <p className="text-sm text-gray-400">Mensagens/mês</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">98%</p>
              <p className="text-sm text-gray-400">Satisfação</p>
            </div>
          </div>

          {/* Testimonial carousel */}
          <div className="relative">
            <Quote className="w-10 h-10 text-[#F26522]/30 mb-4" />
            
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`transition-all duration-700 ${
                  index === activeTestimonial
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
                }`}
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#F26522] text-[#F26522]" />
                  ))}
                </div>

                <p className="text-xl text-white font-medium leading-relaxed mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#F26522]/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-[#F26522]">
                      {testimonial.author.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Carousel dots */}
          <div className="mt-8 flex gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveTestimonial(index)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index === activeTestimonial ? 'w-8 bg-[#F26522]' : 'w-1.5 bg-white/20 hover:bg-white/40'
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Crie sua conta</h1>
            <p className="text-gray-500">
              Comece seu trial gratuito de 14 dias. Sem cartão de crédito.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
                Nome da Empresa *
              </Label>
              <Input
                id="companyName"
                placeholder="Minha Empresa Ltda"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-[#F26522] focus:ring-[#F26522]/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Seu nome *
              </Label>
              <Input
                id="name"
                placeholder="João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-[#F26522] focus:ring-[#F26522]/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email corporativo *
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
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Crie uma senha *
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-[#F26522] focus:ring-[#F26522]/20 transition-all"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#F26522] hover:bg-[#d4561c] text-white font-semibold text-base shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 transition-all hover:-translate-y-0.5"
                disabled={isLoading}
              >
                {isLoading ? 'Criando conta...' : 'Criar conta grátis'}
              </Button>
            </div>
          </form>

          {/* Terms */}
          <p className="text-xs text-gray-400 text-center mt-4">
            Ao criar sua conta, você concorda com nossos{' '}
            <Link href="#" className="text-[#F26522] hover:underline">Termos de Uso</Link> e{' '}
            <Link href="#" className="text-[#F26522] hover:underline">Política de Privacidade</Link>.
          </p>

          {/* Divider */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-[#F26522] font-semibold hover:underline">
                Faça o login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
