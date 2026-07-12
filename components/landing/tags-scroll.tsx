'use client'

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
  return (
    <section className="py-10 border-y border-gray-100 overflow-hidden">
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10" />

        {/* Marquee container */}
        <div className="flex animate-marquee">
          {/* First set */}
          <div className="flex items-center gap-4 shrink-0 px-2">
            {tags.map((tag) => (
              <div
                key={tag.label}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full whitespace-nowrap text-sm text-gray-700 hover:border-[#F26522]/40 hover:bg-orange-50/50 transition-colors cursor-default"
              >
                <tag.icon className="h-4 w-4 text-[#F26522]/60" />
                {tag.label}
              </div>
            ))}
          </div>
          {/* Duplicate for seamless loop */}
          <div className="flex items-center gap-4 shrink-0 px-2">
            {tags.map((tag) => (
              <div
                key={`dup-${tag.label}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full whitespace-nowrap text-sm text-gray-700 hover:border-[#F26522]/40 hover:bg-orange-50/50 transition-colors cursor-default"
              >
                <tag.icon className="h-4 w-4 text-[#F26522]/60" />
                {tag.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
