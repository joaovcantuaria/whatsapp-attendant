'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const columns = [
  {
    name: 'CONTATO INICIAL',
    color: 'text-blue-600',
    dotColor: 'bg-blue-500',
    count: 3,
    cards: [
      { name: 'Maria Silva', company: 'Info Systems' },
      { name: 'João Costa', company: 'Tech Corp' },
      { name: 'Ana Souza', company: 'Digital Plus' },
    ],
  },
  {
    name: 'CONTATO REALIZADO',
    color: 'text-green-600',
    dotColor: 'bg-green-500',
    count: 2,
    cards: [
      { name: 'Pedro Santos', company: 'WebDev Co' },
      { name: 'Lucas Lima', company: 'StartApp' },
    ],
  },
  {
    name: 'CADASTRADO',
    color: 'text-yellow-600',
    dotColor: 'bg-yellow-500',
    count: 2,
    cards: [
      { name: 'Julia Ferreira', company: 'MKT Digital' },
      { name: 'Carlos Mendes', company: 'Vendas Online' },
    ],
  },
  {
    name: 'CONCLUÍDO',
    color: 'text-orange-600',
    dotColor: 'bg-orange-500',
    count: 3,
    cards: [
      { name: 'Ricardo Alves', company: 'Tech Solutions' },
      { name: 'Fernanda Dias', company: 'E-commerce Pro' },
      { name: 'Paulo Neto', company: 'AGN Digital' },
    ],
  },
]

export function CRMPipeline() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-20 lg:py-32" ref={ref}>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full mb-4">
              CRM PIPELINE
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Acompanhe seus leads em tempo real.
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto mb-12">
              Visualize cada etapa da jornada comercial com um pipeline vivo que mostra contatos entrando, sendo trabalhados pela equipe e chegando até a conclusão.
            </p>
          </motion.div>

          {/* Kanban mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="overflow-x-auto"
          >
            <div className="grid grid-cols-4 gap-4 min-w-[700px]">
              {columns.map((col, colIndex) => (
                <motion.div
                  key={col.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.1 * colIndex + 0.3 }}
                  className="bg-gray-50 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                      <span className={`text-[10px] font-bold uppercase ${col.color}`}>
                        {col.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{col.count}</span>
                  </div>
                  <div className="space-y-2">
                    {col.cards.map((card) => (
                      <div key={card.name} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-1.5 w-8 bg-[#F26522]/30 rounded-full" />
                          <div className="h-1.5 w-5 bg-blue-200 rounded-full" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">{card.name}</div>
                        <div className="text-[10px] text-gray-400">{card.company}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
