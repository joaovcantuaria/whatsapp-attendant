'use client'

import { useState } from 'react'
import { HeadphonesIcon, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface Ticket {
  id: string
  subject: string
  company: string
  status: 'open' | 'in_progress' | 'resolved'
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  lastMessage: string
}

const defaultTickets: Ticket[] = [
  { id: '1', subject: 'Erro ao enviar mensagem em massa', company: 'TechStore', status: 'open', priority: 'high', createdAt: '2026-07-12T14:30:00', lastMessage: 'Ao tentar disparar campanha aparece erro 500' },
  { id: '2', subject: 'Dúvida sobre integração via webhook', company: 'Fast Delivery', status: 'in_progress', priority: 'medium', createdAt: '2026-07-11T10:00:00', lastMessage: 'Preciso saber o formato do payload' },
  { id: '3', subject: 'Solicitar mais atendentes no plano', company: 'Digital Solutions', status: 'open', priority: 'low', createdAt: '2026-07-10T16:45:00', lastMessage: 'Gostaria de adicionar mais 5 atendentes' },
  { id: '4', subject: 'QR Code não conecta', company: 'Beauty Salon', status: 'resolved', priority: 'medium', createdAt: '2026-07-09T08:20:00', lastMessage: 'Resolvido após limpar cache do navegador' },
]

export default function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>(defaultTickets)
  const [filter, setFilter] = useState('all')

  function updateStatus(id: string, status: Ticket['status']) {
    setTickets(tickets.map(t => t.id === id ? { ...t, status } : t))
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)

  const statusConfig = {
    open: { label: 'Aberto', color: 'bg-red-50 text-red-600', icon: AlertCircle },
    in_progress: { label: 'Em Andamento', color: 'bg-yellow-50 text-yellow-700', icon: Clock },
    resolved: { label: 'Resolvido', color: 'bg-green-50 text-green-600', icon: CheckCircle },
  }

  const priorityConfig = {
    low: { label: 'Baixa', color: 'text-gray-500' },
    medium: { label: 'Média', color: 'text-yellow-600' },
    high: { label: 'Alta', color: 'text-red-600' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suporte</h1>
        <p className="text-sm text-gray-500">Tickets de suporte das empresas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{tickets.filter(t => t.status === 'open').length}</p>
          <p className="text-xs text-gray-500">Abertos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{tickets.filter(t => t.status === 'in_progress').length}</p>
          <p className="text-xs text-gray-500">Em Andamento</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{tickets.filter(t => t.status === 'resolved').length}</p>
          <p className="text-xs text-gray-500">Resolvidos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'Todos' },
          { value: 'open', label: 'Abertos' },
          { value: 'in_progress', label: 'Em Andamento' },
          { value: 'resolved', label: 'Resolvidos' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.value ? 'bg-[#F26522] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tickets */}
      <div className="space-y-3">
        {filtered.map((ticket) => {
          const status = statusConfig[ticket.status]
          const StatusIcon = status.icon
          return (
            <div key={ticket.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status.color}`}>
                  <StatusIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{ticket.subject}</h3>
                    <span className={`text-[10px] font-medium ${priorityConfig[ticket.priority].color}`}>
                      ● {priorityConfig[ticket.priority].label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{ticket.company} · {new Date(ticket.createdAt).toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{ticket.lastMessage}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {ticket.status !== 'resolved' && (
                    <>
                      {ticket.status === 'open' && (
                        <button
                          onClick={() => updateStatus(ticket.id, 'in_progress')}
                          className="text-[10px] px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-medium"
                        >
                          Atender
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(ticket.id, 'resolved')}
                        className="text-[10px] px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100 font-medium"
                      >
                        Resolver
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
