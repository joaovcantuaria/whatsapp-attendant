import Link from 'next/link'
import { Check, Zap } from 'lucide-react'

const plans = [
  {
    name: 'Starter',
    price: 'R$ 297',
    description: 'Ideal para pequenas empresas',
    features: [
      '2 atendentes',
      '500 conversas por mês',
      'Respostas rápidas',
      'Templates de mensagem',
      'Chat em tempo real',
      'Suporte por email',
    ],
  },
  {
    name: 'Pro',
    price: 'R$ 597',
    description: 'Para empresas em crescimento',
    highlighted: true,
    features: [
      '5 atendentes',
      '2.000 conversas por mês',
      'Tudo do Starter',
      'Relatórios completos',
      'Métricas por agente',
      'Suporte prioritário',
    ],
  },
  {
    name: 'Business',
    price: 'R$ 997',
    description: 'Para equipes maiores',
    features: [
      '15 atendentes',
      '10.000 conversas por mês',
      'Tudo do Pro',
      'Acesso via API',
      'Integrações customizadas',
      'Gerente de conta dedicado',
    ],
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="BoraGerir" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-xl">
              <span className="text-[#F26522]">Bora</span>
              <span>Gerir</span>
              <span className="text-[#25D366] ml-1">Conversas</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Login</Link>
            <Link href="/register" className="bg-[#F26522] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#C94E10]">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">Planos e Preços</h1>
            <p className="text-xl text-gray-600">
              Comece grátis por 14 dias. Sem cartão de crédito.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl border ${
                  plan.highlighted ? 'border-[#F26522] ring-2 ring-[#F26522]/20 shadow-xl' : 'shadow-sm'
                }`}
              >
                {plan.highlighted && (
                  <span className="text-xs font-medium text-[#F26522] bg-orange-50 px-3 py-1 rounded-full">
                    Mais popular
                  </span>
                )}
                <h3 className="font-bold text-2xl mt-4">{plan.name}</h3>
                <p className="text-gray-600 mt-1">{plan.description}</p>
                <p className="text-4xl font-bold mt-6">
                  {plan.price}
                  <span className="text-base font-normal text-gray-500">/mês</span>
                </p>
                <ul className="space-y-3 mt-8 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-[#25D366] shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-3 px-6 rounded-lg font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-[#F26522] text-white hover:bg-[#C94E10]'
                      : 'border-2 border-gray-200 hover:border-[#F26522] hover:text-[#F26522]'
                  }`}
                >
                  Começar grátis
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
