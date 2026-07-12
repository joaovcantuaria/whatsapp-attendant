'use client'

import { useState } from 'react'
import { Lightbulb, Plus, Edit, Trash2, Check, X } from 'lucide-react'

interface Solution {
  id: string
  title: string
  description: string
  status: 'active' | 'development' | 'planned'
  category: string
}

const defaultSolutions: Solution[] = [
  { id: '1', title: 'Agente IA', description: 'Automatização de primeiro atendimento com inteligência artificial', status: 'active', category: 'Automação' },
  { id: '2', title: 'CRM Pipeline', description: 'Gestão visual de leads com pipeline kanban', status: 'active', category: 'Vendas' },
  { id: '3', title: 'Campanhas em Massa', description: 'Disparo de mensagens segmentadas para base de contatos', status: 'active', category: 'Marketing' },
  { id: '4', title: 'Chat Interno', description: 'Comunicação entre atendentes na plataforma', status: 'active', category: 'Comunicação' },
  { id: '5', title: 'Webhooks & API', description: 'Integrações externas via webhooks e API REST', status: 'active', category: 'Integração' },
  { id: '6', title: 'Chatbot Flow Builder', description: 'Editor visual de fluxos de chatbot', status: 'development', category: 'Automação' },
  { id: '7', title: 'Relatórios Avançados', description: 'Dashboards customizáveis com métricas detalhadas', status: 'planned', category: 'Analytics' },
]

export default function AdminSolutions() {
  const [solutions, setSolutions] = useState<Solution[]>(defaultSolutions)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '', status: 'planned' as Solution['status'], category: '' })

  function addSolution() {
    setSolutions([...solutions, { id: Date.now().toString(), ...formData }])
    setShowForm(false)
    setFormData({ title: '', description: '', status: 'planned', category: '' })
  }

  function deleteSolution(id: string) {
    if (confirm('Excluir esta solução?')) setSolutions(solutions.filter(s => s.id !== id))
  }

  const statusConfig = {
    active: { label: 'Ativo', color: 'bg-green-50 text-green-600' },
    development: { label: 'Em Desenvolvimento', color: 'bg-yellow-50 text-yellow-700' },
    planned: { label: 'Planejado', color: 'bg-blue-50 text-blue-600' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soluções</h1>
          <p className="text-sm text-gray-500">Funcionalidades e módulos do sistema</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F26522] text-white rounded-lg text-sm font-medium hover:bg-[#d4561c]"
        >
          <Plus className="w-4 h-4" />
          Nova Solução
        </button>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {solutions.map((solution) => (
          <div key={solution.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-[#F26522]" />
              </div>
              <button onClick={() => deleteSolution(solution.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{solution.title}</h3>
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{solution.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                {solution.category}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[solution.status].color}`}>
                {statusConfig[solution.status].label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nova Solução</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Título</label>
                <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Descrição</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Categoria</label>
                  <input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Solution['status'] })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522]">
                    <option value="planned">Planejado</option>
                    <option value="development">Em Desenvolvimento</option>
                    <option value="active">Ativo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={addSolution} className="flex-1 px-4 py-2 rounded-lg bg-[#F26522] text-white text-sm font-medium hover:bg-[#d4561c]">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
