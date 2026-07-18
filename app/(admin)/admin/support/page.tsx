'use client'

import { useState, useEffect } from 'react'
import { HeadphonesIcon, Plus, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface Ticket {
  id: string
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  company_id: string
  companies?: { name: string }
  created_at: string
  updated_at: string
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState({ subject: '', description: '', company_id: '', priority: 'medium' })

  useEffect(() => {
    loadTickets()
    loadCompanies()
  }, [])

  async function loadTickets() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/support')
      if (res.ok) {
        const data = await res.json()
        setTickets(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadCompanies() {
    try {
      const res = await fetch('/api/admin/companies')
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.map((c: any) => ({ id: c.id, name: c.name })))
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function createTicket() {
    const res = await fetch('/api/admin/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    if (res.ok) {
      await loadTickets()
      setShowForm(false)
      setFormData({ subject: '', description: '', company_id: '', priority: 'medium' })
    }
  }

  async function updateStatus(id: string, status: Ticket['status']) {
    const res = await fetch('/api/admin/support', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}) }),
    })
    if (res.ok) {
      setTickets(tickets.map(t => t.id === id ? { ...t, status } : t))
    }
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)

  const statusConfig: Record<string, { label: string; color: string; icon: typeof AlertCircle }> = {
    open: { label: 'Aberto', color: 'bg-red-500/10 text-red-600', icon: AlertCircle },
    in_progress: { label: 'Em Andamento', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
    resolved: { label: 'Resolvido', color: 'bg-green-500/10 text-green-600', icon: CheckCircle },
    closed: { label: 'Fechado', color: 'bg-slate-100 text-slate-500', icon: CheckCircle },
  }

  const priorityConfig: Record<string, { label: string; color: string }> = {
    low: { label: 'Baixa', color: 'text-slate-500' },
    medium: { label: 'Média', color: 'text-amber-600' },
    high: { label: 'Alta', color: 'text-red-600' },
    urgent: { label: 'Urgente', color: 'text-red-700' },
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Suporte</h1>
          <p className="text-sm text-slate-500">Tickets de suporte das empresas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <p className="text-lg font-bold text-red-600">{tickets.filter(t => t.status === 'open').length}</p>
          <p className="text-[11px] text-slate-500">Abertos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <p className="text-lg font-bold text-amber-600">{tickets.filter(t => t.status === 'in_progress').length}</p>
          <p className="text-[11px] text-slate-500">Em Andamento</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <p className="text-lg font-bold text-green-600">{tickets.filter(t => t.status === 'resolved').length}</p>
          <p className="text-[11px] text-slate-500">Resolvidos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <p className="text-lg font-bold text-slate-600">{tickets.length}</p>
          <p className="text-[11px] text-slate-500">Total</p>
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
              filter === f.value ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tickets */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-400">Nenhum ticket encontrado</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket) => {
            const status = statusConfig[ticket.status] || statusConfig.open
            const StatusIcon = status.icon
            return (
              <div key={ticket.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${status.color}`}>
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{ticket.subject}</h3>
                      <span className={`text-[10px] font-medium ${priorityConfig[ticket.priority]?.color || ''}`}>
                        ● {priorityConfig[ticket.priority]?.label || ticket.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">
                      {(ticket as any).companies?.name || 'Sem empresa'} · {new Date(ticket.created_at).toLocaleString('pt-BR')}
                    </p>
                    {ticket.description && (
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 line-clamp-2">{ticket.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {ticket.status === 'open' && (
                      <button
                        onClick={() => updateStatus(ticket.id, 'in_progress')}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 font-medium transition-colors"
                      >
                        Atender
                      </button>
                    )}
                    {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                      <button
                        onClick={() => updateStatus(ticket.id, 'resolved')}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 font-medium transition-colors"
                      >
                        Resolver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New ticket form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-base font-bold text-slate-900 mb-4">Novo Ticket</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Assunto</label>
                <input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Empresa</label>
                  <select
                    value={formData.company_id}
                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                  >
                    <option value="">Selecionar...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Prioridade</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={createTicket} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">
                Criar Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
