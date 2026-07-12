'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  MessagesSquare,
  Send,
  PieChart,
  Bot
} from 'lucide-react'

const features = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard Intuitivo',
    description: 'Visão completa dos atendimentos, contatos e desempenho da equipe.',
  },
  {
    icon: Users,
    title: 'Vários Atendentes',
    description: 'Cadastre toda a sua equipe no painel, dividido por departamentos.',
    highlighted: true,
  },
  {
    icon: Calendar,
    title: 'Agendamentos',
    description: 'Envie mensagens no momento certo com agendamento inteligente.',
  },
  {
    icon: MessageSquare,
    title: 'Respostas Rápidas',
    description: 'Digite "/" para acessar sua lista de mensagens prontas.',
  },
  {
    icon: MessagesSquare,
    title: 'Chat Interno',
    description: 'Comunicação entre atendentes sem sair da plataforma.',
  },
  {
    icon: Send,
    title: 'Envios em Massa',
    description: 'Campanhas segmentadas para toda a sua base de contatos.',
  },
  {
    icon: PieChart,
    title: 'CRM Integrado',
    description: 'Pipeline visual para acompanhar a jornada do cliente.',
  },
  {
    icon: Bot,
    title: 'Agente IA',
    description: 'Automatize o primeiro contato e direcione ao setor certo.',
  },
]

export function FeaturesGrid() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="funcionalidades" className="py-20 lg:py-28 bg-gray-50/50">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto" ref={ref}>
          {/* Header - Centralizado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-4">
              Funcionalidades
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Centralize e Potencialize Seu Atendimento
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Transforme a comunicação do seu negócio com ferramentas pensadas para escalar.
            </p>
          </motion.div>

          {/* Cards Grid - Centralizado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.06 * i }}
                className={`p-5 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                  feature.highlighted
                    ? 'bg-[#F26522] text-white border-[#F26522]'
                    : 'bg-white border-gray-100 hover:border-orange-200'
                }`}
              >
                <feature.icon className={`h-5 w-5 mb-3 ${
                  feature.highlighted ? 'text-white' : 'text-[#F26522]'
                }`} />
                <h3 className={`font-semibold text-sm mb-1.5 ${
                  feature.highlighted ? 'text-white' : 'text-gray-900'
                }`}>
                  {feature.title}
                </h3>
                <p className={`text-xs leading-relaxed ${
                  feature.highlighted ? 'text-white/80' : 'text-gray-500'
                }`}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
