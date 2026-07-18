'use client'

import { useState, useEffect } from 'react'
import { Building2, Search, Bell, Ban, CheckCircle, Users, RefreshCw } from 'lucide-react'

interface Company {
  id: string
  name: string
  email: string
  phone: string
  plan_status: string
  created_at: string
  members_count: number
  plans?: { name: string; slug: string; price_monthly: number }
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionModal, setActionModal] = useState<{ company: Company; action: string } | null>(null)
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    loadCompanies()
  }, [])

  async function loadCompanies() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/companies')
      if (res.ok) {
        const data = await res.json()
        setCompanies(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function suspendCompany(company: Company) {
    const newStatus = company.plan_status === 'suspended' ? 'active' : 'suspended'
    const res = await fetch('/api/admin/companies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: company.id, plan_status: newStatus }),
    })
    if (res.ok) {
      setCompanies(companies.map(c => c.id === company.id ? { ...c, plan_status: newStatus } : c))
      setActionModal(null)
    }
  }

  function executeAction() {
    if (!actionModal) return
    if (actionModal.action === 'Suspender Acesso') {
      suspendCompany(actionModal.company)
    } else {
      // Para notificações/email — placeholder
      alert(`"${actionModal.action}" enviado para ${actionModal.company.name}: ${actionMessage}`)
      setActionModal(null)
      setActionMessage('')
    }
  }

  const filtered = companies.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-600',
    trial: 'bg-amber-500/10 text-amber-600',
    suspended: 'bg-red-500/10 text-red-600',
    cancelled: 'bg-slate-100 text-slate-500',
  }

  const statusLabels: Record<string, string> = {
    active: 'Ativo',
    trial: 'Trial',
    suspended: 'Suspenso',
    cancelled: 'Cancelado',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Empresas</h1>
          <p className="text-sm text-slate-500">{companies.length} empresas cadastradas</p>
        </div>
        <button
          onClick={loadCompanies}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 bg-white shadow-sm"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">Nenhuma empresa encontrada</div>
        ) : (
          filtered.map((company) => (
            <div key={company.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{company.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[company.plan_status] || statusColors.cancelled}`}>
                    {statusLabels[company.plan_status] || company.plan_status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {company.email} · Plano: {(company.plans as any)?.name || '—'} · {company.members_count} membros
                </p>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {company.members_count}
                </div>
                <span>{new Date(company.created_at).toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => { setActionModal({ company, action: 'Enviar Notificação' }); setActionMessage('') }}
                  className="p-2 rounded-lg hover:bg-orange-50 text-slate-400 hover:text-orange-600 transition-colors"
                  title="Enviar notificação"
                >
                  <Bell className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setActionModal({ company, action: 'Suspender Acesso' }); setActionMessage('') }}
                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                  title={company.plan_status === 'suspended' ? 'Reativar' : 'Suspender'}
                >
                  {company.plan_status === 'suspended' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-base font-bold text-slate-900 mb-1">{actionModal.action}</h2>
            <p className="text-sm text-slate-500 mb-4">
              {actionModal.action === 'Suspender Acesso'
                ? `${actionModal.company.plan_status === 'suspended' ? 'Reativar' : 'Suspender'} a empresa "${actionModal.company.name}"?`
                : `Para "${actionModal.company.name}"`}
            </p>
            {actionModal.action !== 'Suspender Acesso' && (
              <textarea
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                placeholder="Escreva a mensagem..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400 resize-none mb-4"
                rows={3}
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeAction}
                className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
