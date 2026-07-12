'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Building2, Search, Send, Mail, Bell, Ban, MoreVertical, MessageSquare } from 'lucide-react'

interface Company {
  id: string
  name: string
  email: string
  phone: string
  plan: string
  created_at: string
  is_active: boolean
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedAction, setSelectedAction] = useState<{ company: Company; action: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadCompanies()
  }, [])

  async function loadCompanies() {
    setLoading(true)
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setCompanies(data.map(c => ({ ...c, is_active: true, plan: 'Profissional' })))
    }
    setLoading(false)
  }

  function handleAction(company: Company, action: string) {
    setSelectedAction({ company, action })
  }

  function executeAction() {
    if (!selectedAction) return
    alert(`Ação "${selectedAction.action}" executada para ${selectedAction.company.name}`)
    setSelectedAction(null)
  }

  const filtered = companies.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
        <p className="text-sm text-gray-500">Gerencie e interaja com as empresas cadastradas</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522]/20"
        />
      </div>

      {/* Companies grid */}
      <div className="grid gap-3">
        {loading ? (
          <div className="text-center py-8 text-sm text-gray-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">Nenhuma empresa encontrada</div>
        ) : (
          filtered.map((company) => (
            <div key={company.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#F26522]/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#F26522]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{company.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                    {company.plan}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{company.email} · Desde {new Date(company.created_at).toLocaleDateString('pt-BR')}</p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAction(company, 'Enviar Notificação')}
                  className="p-2 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-[#F26522] transition-colors"
                  title="Enviar notificação"
                >
                  <Bell className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAction(company, 'Enviar Email')}
                  className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Enviar email"
                >
                  <Mail className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAction(company, 'Enviar Mensagem WhatsApp')}
                  className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                  title="Enviar WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAction(company, 'Suspender Acesso')}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                  title="Suspender"
                >
                  <Ban className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action confirm modal */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">{selectedAction.action}</h2>
            <p className="text-sm text-gray-500 mb-4">
              Executar ação para <strong>{selectedAction.company.name}</strong>?
            </p>
            {(selectedAction.action === 'Enviar Notificação' || selectedAction.action === 'Enviar Email' || selectedAction.action === 'Enviar Mensagem WhatsApp') && (
              <textarea
                placeholder="Escreva a mensagem..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522] resize-none mb-4"
                rows={3}
              />
            )}
            <div className="flex gap-3">
              <button onClick={() => setSelectedAction(null)} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={executeAction} className="flex-1 px-4 py-2 rounded-lg bg-[#F26522] text-white text-sm font-medium hover:bg-[#d4561c]">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
