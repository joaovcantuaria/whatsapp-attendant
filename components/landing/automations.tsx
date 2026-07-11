'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Bot, Brain, Sparkles } from 'lucide-react'

export function Automations() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-20 lg:py-32 bg-gray-50/50" ref={ref}>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-4">
                Automações
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase">
                Robôs e Automações que trabalham por você.
              </h2>
              <p className="text-gray-500 text-lg mb-8">
                Recursos inteligentes para criar fluxos de conversa, disparar mensagens em massa e atender automaticamente em múltiplos canais.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-gray-700" />
                  </div>
                  <span className="font-medium text-gray-900">Robô</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-gray-700" />
                  </div>
                  <span className="font-medium text-gray-900">Agente de Inteligência Artificial</span>
                </div>
                <div className="p-5 bg-gray-900 rounded-xl text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="h-5 w-5 text-[#F26522]" />
                    <span className="font-semibold">Campanhas Segmentadas</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Você pode criar campanhas com base no comportamento do cliente, no histórico de interações ou em dados específicos da sua base de contatos. Programe os envios para os melhores horários e personalize os resultados em tempo real.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Visual */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center"
            >
              <div className="bg-white rounded-2xl shadow-xl border p-6 w-full max-w-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                  <Sparkles className="h-4 w-4 text-[#F26522]" />
                  <span className="text-sm font-medium">Nova Campanha</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-green-700 mb-1">Segmento</div>
                    <div className="text-sm">Leads ativos nos últimos 7 dias</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-orange-700 mb-1">Template</div>
                    <div className="text-sm">Promoção de fim de mês</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-blue-700 mb-1">Agendamento</div>
                    <div className="text-sm">Amanhã, 09:00</div>
                  </div>
                  <button className="w-full bg-[#F26522] text-white py-2.5 rounded-lg text-sm font-medium">
                    Enviar Campanha
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
