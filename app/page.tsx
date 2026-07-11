import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle, Users, Zap, BarChart3, Clock, Shield, Check } from 'lucide-react'
import logoImg from './logo.png'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <Image src={logoImg} alt="BoraGerir Conversas" className="h-14 w-auto" priority />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">
              Planos
            </Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-[#F26522] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#C94E10] transition-colors"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
            Atendimento via WhatsApp
            <span className="text-[#25D366]"> para sua equipe</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Gerencie todas as conversas do WhatsApp Business da sua empresa em um só lugar.
            Múltiplos atendentes, templates, métricas e muito mais.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-[#F26522] text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-[#C94E10] transition-colors shadow-lg shadow-[#F26522]/20"
            >
              Teste grátis por 14 dias
            </Link>
            <Link
              href="/pricing"
              className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Ver planos
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Tudo que sua equipe precisa
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard
              icon={<MessageCircle className="h-6 w-6" />}
              title="Chat em tempo real"
              description="Receba e responda mensagens do WhatsApp instantaneamente com atualizações em tempo real."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Múltiplos atendentes"
              description="Distribua conversas entre sua equipe. Atribua, transfira e acompanhe cada atendimento."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Respostas rápidas"
              description="Crie atalhos para respostas frequentes e agilize o tempo de resposta da equipe."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Relatórios e métricas"
              description="Acompanhe volume de mensagens, tempo médio de resposta e desempenho dos atendentes."
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Mensagens automáticas"
              description="Configure boas-vindas e mensagens de ausência baseadas no horário de atendimento."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Templates aprovados"
              description="Gerencie e envie templates aprovados pela Meta, mesmo após a janela de 24h."
            />
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            Planos simples e transparentes
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Comece com 14 dias grátis em qualquer plano
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Starter"
              price="R$ 297"
              description="Ideal para pequenas empresas"
              features={['2 atendentes', '500 conversas/mês', 'Respostas rápidas', 'Templates']}
            />
            <PricingCard
              name="Pro"
              price="R$ 597"
              description="Para empresas em crescimento"
              features={['5 atendentes', '2.000 conversas/mês', 'Relatórios completos', 'Tudo do Starter']}
              highlighted
            />
            <PricingCard
              name="Business"
              price="R$ 997"
              description="Para equipes maiores"
              features={['15 atendentes', '10.000 conversas/mês', 'API de acesso', 'Tudo do Pro']}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <Image src={logoImg} alt="BoraGerir Conversas" className="h-10 w-auto" />
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <Link href="/pricing">Planos</Link>
              <Link href="/login">Login</Link>
              <Link href="/register">Cadastro</Link>
            </div>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} BoraGerir Conversas. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center text-[#F26522] mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}

function PricingCard({ name, price, description, features, highlighted }: {
  name: string; price: string; description: string; features: string[]; highlighted?: boolean
}) {
  return (
    <div className={`p-6 rounded-xl border ${highlighted ? 'border-[#F26522] ring-2 ring-[#F26522]/20 shadow-lg' : 'shadow-sm'}`}>
      {highlighted && (
        <span className="text-xs font-medium text-[#F26522] bg-orange-50 px-2 py-1 rounded-full">
          Mais popular
        </span>
      )}
      <h3 className="font-bold text-xl mt-2">{name}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <p className="text-3xl font-bold mb-1">{price}<span className="text-sm font-normal text-gray-500">/mês</span></p>
      <ul className="space-y-2 mt-6 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-[#25D366]" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className={`block text-center py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
          highlighted
            ? 'bg-[#F26522] text-white hover:bg-[#C94E10]'
            : 'border border-gray-300 hover:bg-gray-50'
        }`}
      >
        Começar grátis
      </Link>
    </div>
  )
}
