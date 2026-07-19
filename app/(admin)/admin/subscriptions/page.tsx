'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Check, Users, RefreshCw } from 'lucide-react'

interface Plan {
  id: string
  name: string
  slug: string
  price_monthly: number
  price_yearly?: number
  max_agents: number
  max_messages: number
  max_contacts: number
  features: string[]
  is_active: boolean
  subscribers: number
}

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price_monthly: '',
    price_yearly: '',
    max_agents: '1',
    max_messages: '1000',
    max_contacts: '500',
    features: '',
  })

  useEffect(() => {
    loadPlans()
  }, [])

  async function loadPlans() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/plans')
      if (res.ok) {
        const data = await res.json()
        const parsed = Array.isArray(data) ? data.map((plan: any) => ({
          ...plan,
          features: parseFeatures(plan.features),
          max_agents: plan.max_agents ?? 0,
          max_messages: plan.max_messages ?? 0,
          max_contacts: plan.max_contacts ?? 0,
          price_monthly: plan.price_monthly ?? 0,
        })) : []
        setPlans(parsed)
      } else {
        console.error('Erro ao carregar planos:', res.status)
        setPlans([])
      }
    } catch (e) {
      console.error(e)
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  function parseFeatures(features: any): string[] {
    if (Array.isArray(features)) return features
    if (typeof features === 'string') {
      try {
        const parsed = JSON.parse(features)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return features.split('\n').filter(Boolean)
      }
    }
    return []
  }

  async function savePlan() {
    const payload = {
      name: formData.name,
      price_monthly: Number(formData.price_monthly),
      price_yearly: formData.price_yearly ? Number(formData.price_yearly) : null,
      max_agents: Number(formData.max_agents),
      max_messages: Number(formData.max_messages),
      max_contacts: Number(formData.max_contacts),
      features: formData.features.split('\n').filter(Boolean),
    }

    if (editing) {
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...payload }),
      })
      if (res.ok) {
        await loadPlans()
        closeForm()
      }
    } else {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        await loadPlans()
        closeForm()
      }
    }
  }

  async function deletePlan(id: string) {
    if (!confirm('Excluir este plano? Só é possível se não houver assinantes.')) return
    const res = await fetch(`/api/admin/plans?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPlans(plans.filter(p => p.id !== id))
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao excluir')
    }
  }

  async function togglePlan(plan: Plan) {
    const res = await fetch('/api/admin/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plan.id, is_active: !plan.is_active }),
    })
    if (res.ok) {
      setPlans(plans.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p))
    }
  }

  function startEdit(plan: Plan) {
    setEditing(plan)
    setFormData({
      name: plan.name,
      price_monthly: plan.price_monthly.toString(),
      price_yearly: plan.price_yearly?.toString() || '',
      max_agents: plan.max_agents.toString(),
      max_messages: plan.max_messages.toString(),
      max_contacts: plan.max_contacts.toString(),
      features: (plan.features || []).join('\n'),
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setFormData({ name: '', price_monthly: '', price_yearly: '', max_agents: '1', max_messages: '1000', max_contacts: '500', features: '' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Assinaturas & Planos</h1>
          <p className="text-sm text-slate-500">Gerencie os planos disponíveis na plataforma</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setFormData({ name: '', price_monthly: '', price_yearly: '', max_agents: '1', max_messages: '1000', max_contacts: '500', features: '' }) }}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Plano
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className={`bg-white rounded-2xl border p-5 relative transition-all duration-200 ${
            plan.is_active ? 'border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5' : 'border-slate-100 opacity-50 shadow-md'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                plan.is_active ? 'bg-green-500/10 text-green-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {plan.is_active ? 'Ativo' : 'Inativo'}
              </span>
              <div className="flex gap-1">
                <button onClick={() => startEdit(plan)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deletePlan(plan.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mt-1 mb-4">
              <span className="text-2xl font-bold text-orange-500">R${plan.price_monthly ?? 0}</span>
              <span className="text-sm text-slate-400">/mês</span>
            </div>

            <div className="space-y-1.5 mb-4">
              <div className="text-[11px] text-slate-500">
                {plan.max_agents ?? 0} atendentes · {(plan.max_messages ?? 0).toLocaleString()} msgs · {(plan.max_contacts ?? 0).toLocaleString()} contatos
              </div>
              {(plan.features || []).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="w-3 h-3 text-green-500 shrink-0" />
                  <span className="text-xs">{f}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Users className="w-3 h-3" />
                {plan.subscribers} assinantes
              </div>
              <button
                onClick={() => togglePlan(plan)}
                className={`text-[11px] px-3 py-1 rounded-full font-medium transition-colors ${
                  plan.is_active
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                {plan.is_active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && !loading && (
        <div className="text-center py-12 text-sm text-slate-400">
          Nenhum plano cadastrado. Crie o primeiro acima.
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              {editing ? 'Editar Plano' : 'Novo Plano'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Nome do Plano</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="Ex: Profissional"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Preço Mensal (R$)</label>
                  <input
                    type="number"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Preço Anual (R$)</label>
                  <input
                    type="number"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Atendentes</label>
                  <input
                    type="number"
                    value={formData.max_agents}
                    onChange={(e) => setFormData({ ...formData, max_agents: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Mensagens</label>
                  <input
                    type="number"
                    value={formData.max_messages}
                    onChange={(e) => setFormData({ ...formData, max_messages: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Contatos</label>
                  <input
                    type="number"
                    value={formData.max_contacts}
                    onChange={(e) => setFormData({ ...formData, max_contacts: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Recursos (um por linha)</label>
                <textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400 resize-none"
                  placeholder="CRM completo&#10;Agente IA&#10;Campanhas"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeForm} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={savePlan} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
