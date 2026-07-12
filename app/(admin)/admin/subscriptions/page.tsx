'use client'

import { useState } from 'react'
import { CreditCard, Plus, Edit, Trash2, Check } from 'lucide-react'

interface Plan {
  id: string
  name: string
  price: number
  interval: string
  features: string[]
  active: boolean
  subscribers: number
}

const defaultPlans: Plan[] = [
  {
    id: '1',
    name: 'Starter',
    price: 97,
    interval: 'mês',
    features: ['2 atendentes', '1.000 mensagens/mês', 'Chat básico', 'Sem CRM'],
    active: true,
    subscribers: 45,
  },
  {
    id: '2',
    name: 'Profissional',
    price: 197,
    interval: 'mês',
    features: ['10 atendentes', 'Mensagens ilimitadas', 'CRM completo', 'Agente IA', 'Campanhas'],
    active: true,
    subscribers: 120,
  },
  {
    id: '3',
    name: 'Enterprise',
    price: 497,
    interval: 'mês',
    features: ['Atendentes ilimitados', 'API dedicada', 'Suporte prioritário', 'Customizações', 'SLA garantido'],
    active: true,
    subscribers: 28,
  },
]

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState<Plan[]>(defaultPlans)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', price: '', interval: 'mês', features: '' })

  function handleSave() {
    if (editing) {
      setPlans(plans.map(p => p.id === editing.id ? {
        ...p,
        name: formData.name,
        price: Number(formData.price),
        interval: formData.interval,
        features: formData.features.split('\n').filter(Boolean),
      } : p))
    } else {
      setPlans([...plans, {
        id: Date.now().toString(),
        name: formData.name,
        price: Number(formData.price),
        interval: formData.interval,
        features: formData.features.split('\n').filter(Boolean),
        active: true,
        subscribers: 0,
      }])
    }
    setShowForm(false)
    setEditing(null)
    setFormData({ name: '', price: '', interval: 'mês', features: '' })
  }

  function startEdit(plan: Plan) {
    setEditing(plan)
    setFormData({
      name: plan.name,
      price: plan.price.toString(),
      interval: plan.interval,
      features: plan.features.join('\n'),
    })
    setShowForm(true)
  }

  function deletePlan(id: string) {
    if (confirm('Excluir este plano?')) {
      setPlans(plans.filter(p => p.id !== id))
    }
  }

  function togglePlan(id: string) {
    setPlans(plans.map(p => p.id === id ? { ...p, active: !p.active } : p))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assinaturas & Planos</h1>
          <p className="text-sm text-gray-500">Gerencie os planos disponíveis no sistema</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setFormData({ name: '', price: '', interval: 'mês', features: '' }) }}
          className="flex items-center gap-2 px-4 py-2 bg-[#F26522] text-white rounded-lg text-sm font-medium hover:bg-[#d4561c] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Plano
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className={`bg-white rounded-xl border p-5 relative ${
            plan.active ? 'border-gray-100' : 'border-gray-100 opacity-60'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                plan.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {plan.active ? 'Ativo' : 'Inativo'}
              </span>
              <div className="flex gap-1">
                <button onClick={() => startEdit(plan)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deletePlan(plan.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mt-1 mb-4">
              <span className="text-2xl font-bold text-[#F26522]">R${plan.price}</span>
              <span className="text-sm text-gray-400">/{plan.interval}</span>
            </div>

            <div className="space-y-2 mb-4">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  {f}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">{plan.subscribers} assinantes</span>
              <button
                onClick={() => togglePlan(plan.id)}
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  plan.active
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                {plan.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? 'Editar Plano' : 'Novo Plano'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Nome</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522]"
                  placeholder="Ex: Profissional"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Intervalo</label>
                  <select
                    value={formData.interval}
                    onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522]"
                  >
                    <option value="mês">Mensal</option>
                    <option value="ano">Anual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Recursos (um por linha)</label>
                <textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522] resize-none"
                  placeholder="10 atendentes&#10;Mensagens ilimitadas&#10;CRM completo"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowForm(false); setEditing(null) }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 rounded-lg bg-[#F26522] text-white text-sm font-medium hover:bg-[#d4561c]"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
