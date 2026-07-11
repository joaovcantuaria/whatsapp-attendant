'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    name: 'Starter',
    tagline: 'Saia do improviso',
    price: 99,
    features: [
      '2 atendentes',
      '500 conversas/mês',
      'Respostas rápidas',
      'Templates',
      'Agente IA',
      '1 WhatsApp',
    ],
    highlighted: false,
  },
  {
    name: 'Premium',
    tagline: 'Crescer exige estrutura',
    price: 219,
    features: [
      '5 atendentes',
      '2.000 conversas/mês',
      'Relatórios completos',
      'CRM Pipeline',
      'Tudo do Starter',
      'Recursos avançados',
      '3 WhatsApps',
    ],
    highlighted: true,
  },
  {
    name: 'Business',
    tagline: 'Feito pra quem lidera',
    price: 497,
    features: [
      '15 atendentes',
      '10.000 conversas/mês',
      'API de acesso',
      'Webhooks',
      'Tudo do Premium',
      'Suporte prioritário',
      '5 WhatsApps',
    ],
    highlighted: false,
  },
]

export function Pricing() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="planos" className="py-20 lg:py-32 bg-gray-50/50" ref={ref}>
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Escolha o plano ideal
            </h2>
            <p className="text-gray-500">
              Teste grátis por 14 dias. Sem cartão de crédito.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.1 * i }}
                className={`relative rounded-2xl p-6 lg:p-8 transition-all ${
                  plan.highlighted
                    ? 'bg-gray-900 text-white shadow-2xl shadow-gray-900/20 scale-[1.02] lg:scale-105'
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#25D366] text-white text-xs font-bold rounded-full">
                    MAIS POPULAR
                  </span>
                )}

                <div className="mb-6">
                  <h3 className={`text-xl font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    Plano {plan.name}
                  </h3>
                  <p className={`text-sm ${plan.highlighted ? 'text-gray-300' : 'text-gray-500'}`}>
                    {plan.tagline}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-sm ${plan.highlighted ? 'text-gray-400' : 'text-gray-400'}`}>R$</span>
                    <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-sm ${plan.highlighted ? 'text-gray-400' : 'text-gray-500'}`}>/mês</span>
                  </div>
                </div>

                <Link
                  href="/register"
                  className={`block text-center py-3 px-4 rounded-xl font-medium text-sm transition-all mb-6 ${
                    plan.highlighted
                      ? 'bg-[#F26522] text-white hover:bg-[#d4561c] shadow-lg shadow-orange-500/20'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  Testar por 14 dias
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className={`h-4 w-4 shrink-0 ${
                        plan.highlighted ? 'text-[#25D366]' : 'text-[#25D366]'
                      }`} />
                      <span className={`text-sm ${plan.highlighted ? 'text-gray-200' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
