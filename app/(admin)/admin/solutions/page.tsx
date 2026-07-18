'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, Plus, Trash2, RefreshCw } from 'lucide-react'

interface Solution {
  id: string
  title: string
  description: string
  status: 'active' | 'development' | 'planned'
  category: string
  created_at: string
}

export default function AdminSolutions() {
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '', status: 'planned' as Solution['status'], category: '' })

  useEffect(() => {
    loadSolutions()
  }, [])

  async function loadSolutions() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/solutions')
      if (res.ok) {
        const data = await res.json()
        setSolutions(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function createSolution() {
    const res = await fetch('/api/admin/solutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    if (res.ok) {
      await loadSolutions()
      setShowForm(false)
      setFormData({ title: '', description: '', status: 'planned', category: '' })
    }
  }

  async function updateStatus(id: string, status: Solution['status']) {
    const res = await fetch('/api/admin/solutions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) {
      setSolutions(solutions.map(s => s.id === id ? { ...s, status } : s))
    }
  }

  async function deleteSolution(id: string) {
    if (!confirm('Excluir esta solução?')) return
    const res = await fetch(`/api/admin/solutions?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSolutions(solutions.filter(s => s.id !== id))
    }
  }

  const statusConfig = {
    active: { label: 'Ativo', color: 'bg-green-500/10 text-green-600' },
    development: { label: 'Em Desenvolvimento', color: 'bg-amber-500/10 text-amber-600' },
    planned: { label: 'Planejado', color: 'bg-blue-500/10 text-blue-600' },
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
          <h1 className="text-xl font-bold text-slate-900">Soluções</h1>
          <p className="text-sm text-slate-500">Funcionalidades e módulos do sistema</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Solução
        </button>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {solutions.map((solution) => (
          <div key={solution.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-orange-500" />
              </div>
              <button
                onClick={() => deleteSolution(solution.id)}
                className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">{solution.title}</h3>
            <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{solution.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                {solution.category}
              </span>
              <select
                value={solution.status}
                onChange={(e) => updateStatus(solution.id, e.target.value as Solution['status'])}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer ${statusConfig[solution.status].color}`}
              >
                <option value="active">Ativo</option>
                <option value="development">Em Desenvolvimento</option>
                <option value="planned">Planejado</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {solutions.length === 0 && (
        <div className="text-center py-12 text-sm text-slate-400">Nenhuma solução cadastrada</div>
      )}

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-base font-bold text-slate-900 mb-4">Nova Solução</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Título</label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Categoria</label>
                  <input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="Automação, Vendas..."
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Solution['status'] })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                  >
                    <option value="planned">Planejado</option>
                    <option value="development">Em Desenvolvimento</option>
                    <option value="active">Ativo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={createSolution} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
