'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Users,
  MessageSquare,
  MessagesSquare,
  BarChart3,
  PieChart,
  Webhook,
  Code,
  Bot
} from 'lucide-react'

const tags = [
  { icon: Users, label: 'Vários atendentes' },
  { icon: MessageSquare, label: 'Respostas rápidas' },
  { icon: MessagesSquare, label: 'Chat interno' },
  { icon: BarChart3, label: 'Relatórios' },
  { icon: PieChart, label: 'CRM' },
  { icon: Webhook, label: 'Webhooks' },
  { icon: Code, label: 'API' },
  { icon: Bot, label: 'Agente IA' },
]

export function TagsScroll() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section className="py-12 border-y border-gray-100" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide"
        >
          {tags.map((tag, i) => (
            <motion.div
              key={tag.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full whitespace-nowrap text-sm text-gray-700 hover:border-[#F26522]/30 hover:bg-orange-50/50 transition-colors cursor-default shrink-0"
            >
              <tag.icon className="h-4 w-4 text-gray-400" />
              {tag.label}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
