'use client'

import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  MessagesSquare,
  Link2,
  PieChart,
  ShieldCheck
} from 'lucide-react'

const tabs = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    badge: 'Dashboard',
    badgeColor: 'bg-green-100 text-green-700',
    title: 'Dashboard Completo em Tempo Real.',
    description: 'Acompanhe em um só lugar os atendimentos, contatos, setores, agendamentos e campanhas.',
    detail: 'Tudo atualizado em tempo real para decisões mais rápidas e inteligentes.',
    bgColor: 'bg-white',
    mockup: 'dashboard',
  },
  {
    id: 'chat',
    icon: MessagesSquare,
    label: 'Chat Interno',
    badge: 'Chat Interno',
    badgeColor: 'bg-blue-100 text-blue-700',
    title: 'Chat Interno Integrado',
    description: 'Facilite a troca de mensagens entre os atendentes e mantenha todo o time alinhado, sem precisar sair da plataforma.',
    detail: 'Colaboração ágil para um atendimento mais eficiente.',
    bgColor: 'bg-green-50',
    mockup: 'chat',
  },
  {
    id: 'integracao',
    icon: Link2,
    label: 'Integração',
    badge: 'Integrações',
    badgeColor: 'bg-orange-100 text-orange-700',
    title: 'Integrações Poderosas para um Atendimento Completo.',
    description: 'WhatsApp Oficial (API Meta) — Atenda com segurança e escalabilidade.',
    detail: 'Conecte-se ao ecossistema mais usado no Brasil.',
    bgColor: 'bg-orange-50',
    mockup: 'integration',
  },
  {
    id: 'crm',
    icon: PieChart,
    label: 'CRM',
    badge: 'CRM',
    badgeColor: 'bg-purple-100 text-purple-700',
    title: 'CRM Pipeline Visual',
    description: 'Visualize cada etapa da jornada comercial com um pipeline vivo que mostra contatos entrando, sendo trabalhados pela equipe e chegando até a conclusão.',
    detail: 'Gerencie leads de forma visual e intuitiva.',
    bgColor: 'bg-purple-50',
    mockup: 'crm',
  },
  {
    id: 'meta',
    icon: ShieldCheck,
    label: 'Certificada pela Meta',
    badge: 'Certificação',
    badgeColor: 'bg-green-100 text-green-700',
    title: 'Plataforma Certificada pela Meta',
    description: 'Segurança e confiabilidade garantidas pela certificação oficial da Meta para uso da WhatsApp Business API.',
    detail: 'Seus dados e de seus clientes estão protegidos.',
    bgColor: 'bg-green-50',
    mockup: 'meta',
  },
]

function MockupDashboard() {
  return (
    <div className="bg-white rounded-xl shadow-lg border p-4 w-full max-w-md">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold">674</div>
          <div className="text-[9px] text-gray-500">Conversas</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold">25</div>
          <div className="text-[9px] text-gray-500">Atendentes</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold">11</div>
          <div className="text-[9px] text-gray-500">Online</div>
        </div>
      </div>
      <div className="h-16 bg-gradient-to-r from-green-50 to-orange-50 rounded-lg flex items-end px-2 pb-1 gap-0.5">
        {[30, 50, 40, 70, 55, 80, 60, 75, 90, 45, 65, 85].map((h, i) => (
          <div key={i} className="flex-1 bg-[#25D366]/50 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

function MockupChat() {
  return (
    <div className="bg-white rounded-xl shadow-lg border p-4 w-full max-w-md">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        <div className="w-6 h-6 rounded-full bg-green-200" />
        <span className="text-xs font-medium">Chat da Equipe</span>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-200 shrink-0" />
          <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-xs">Pessoal, alguém pode atender o cliente #234?</div>
        </div>
        <div className="flex gap-2 justify-end">
          <div className="bg-[#F26522]/10 rounded-lg px-3 py-1.5 text-xs">Eu pego! Já estou vendo aqui.</div>
          <div className="w-5 h-5 rounded-full bg-orange-200 shrink-0" />
        </div>
        <div className="flex gap-2">
          <div className="w-5 h-5 rounded-full bg-purple-200 shrink-0" />
          <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-xs">Boa! Qualquer coisa me chama 👍</div>
        </div>
      </div>
    </div>
  )
}

function MockupCRM() {
  const cols = [
    { name: 'CONTATO INICIAL', color: 'bg-blue-500', count: 3 },
    { name: 'EM ANDAMENTO', color: 'bg-green-500', count: 2 },
    { name: 'CONCLUÍDO', color: 'bg-orange-500', count: 4 },
  ]
  return (
    <div className="bg-white rounded-xl shadow-lg border p-4 w-full max-w-md">
      <div className="grid grid-cols-3 gap-2">
        {cols.map((col) => (
          <div key={col.name} className="space-y-1.5">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${col.color}`} />
              <span className="text-[8px] font-bold text-gray-600 uppercase">{col.name}</span>
            </div>
            {Array.from({ length: col.count }).map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-2">
                <div className="h-2 bg-gray-200 rounded w-3/4 mb-1" />
                <div className="h-1.5 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function getMockup(type: string) {
  switch (type) {
    case 'dashboard': return <MockupDashboard />
    case 'chat': return <MockupChat />
    case 'crm': return <MockupCRM />
    default: return <MockupDashboard />
  }
}

export function FeaturesTabs() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const active = tabs.find(t => t.id === activeTab) || tabs[0]

  return (
    <section className="py-20 lg:py-32" ref={ref}>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Potencialize ao máximo
            </h2>
            <p className="text-gray-500">Diversas funcionalidades para o seu negócio crescer muito.</p>
          </motion.div>

          <div className="grid lg:grid-cols-[240px_1fr] gap-8">
            {/* Sidebar tabs */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#F26522]/10 text-[#F26522] border border-[#F26522]/20'
                      : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </motion.div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className={`${active.bgColor} rounded-2xl p-8 lg:p-12`}
              >
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full mb-4 ${active.badgeColor}`}>
                      {active.badge}
                    </span>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      {active.title}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {active.description}
                    </p>
                    <p className="text-sm text-gray-400">
                      {active.detail}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    {getMockup(active.mockup)}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
