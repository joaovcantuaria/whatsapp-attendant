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
  ArrowRight
} from 'lucide-react'

const features = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard Intuitivo',
    description: 'Tenha uma visão completa dos seus atendimentos, contatos e desempenho da equipe.',
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
    description: 'Nosso recurso de agendamento tem o poder de enviar mensagens no momento certo.',
  },
  {
    icon: MessageSquare,
    title: 'Respostas Rápidas',
    description: 'Com o auto resposta, basta digitar "/" para acessar a sua lista de mensagens rápidas.',
  },
  {
    icon: MessagesSquare,
    title: 'Chat Interno',
    description: 'Seus atendentes podem se comunicar internamente entre eles sem precisar sair da plataforma.',
  },
  {
    icon: Send,
    title: 'Envios em Massa',
    description: 'Envie mensagens para todos os seus contatos com o módulo de campanhas.',
  },
  {
    icon: PieChart,
    title: 'CRM Integrado',
    description: 'Gerencie leads e acompanhe a jornada do cliente com pipeline visual.',
  },
  {
    icon: ArrowRight,
    title: 'Todas as Funcionalidades',
    description: 'Funcionalidades que elevarão seu negócio a um novo patamar.',
    isLink: true,
  },
]

export function FeaturesGrid() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="funcionalidades" className="py-20 lg:py-32 bg-gray-50/50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start" ref={ref}>
            {/* Left side - title + mockup */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-4">
                Funcionalidades
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Centralize e Potencialize Seu Atendimento no WhatsApp
              </h2>
              <p className="text-gray-500 text-lg mb-8">
                Transforme a comunicação do seu negócio.
              </p>

              {/* Dashboard mockup */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">674</div>
                      <div className="text-[10px] text-gray-500">Conversas</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">25</div>
                      <div className="text-[10px] text-gray-500">Atendentes</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">89%</div>
                      <div className="text-[10px] text-gray-500">Satisfação</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">2m</div>
                      <div className="text-[10px] text-gray-500">Tempo resp.</div>
                    </div>
                  </div>
                  <div className="h-24 bg-gradient-to-r from-orange-50 to-green-50 rounded-lg flex items-end px-4 pb-2 gap-1">
                    {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
                      <div key={i} className="flex-1 bg-[#F26522]/60 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right side - cards grid */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.1 * i }}
                  className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-default ${
                    feature.highlighted
                      ? 'bg-[#F26522] text-white border-[#F26522]'
                      : feature.isLink
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white border-gray-100 hover:border-orange-200'
                  }`}
                >
                  <feature.icon className={`h-5 w-5 mb-2 ${
                    feature.highlighted || feature.isLink ? 'text-white' : 'text-[#F26522]'
                  }`} />
                  <h3 className={`font-semibold text-sm mb-1 ${
                    feature.highlighted || feature.isLink ? 'text-white' : 'text-gray-900'
                  }`}>
                    {feature.title}
                  </h3>
                  <p className={`text-xs leading-relaxed ${
                    feature.highlighted || feature.isLink ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
