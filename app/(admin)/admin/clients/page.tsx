'use client'

import { useState, useEffect } from 'react'
import { Search, Trash2, Ban, CheckCircle, RefreshCw, Wifi } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string
  role: string
  is_online: boolean
  created_at: string
  company_id: string
  companies?: { name: string }
}

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function deleteClient(id: string) {
    if (!confirm('Tem certeza que deseja excluir este cliente? Essa ação não pode ser desfeita.')) return
    const res = await fetch(`/api/admin/clients?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setClients(clients.filter(c => c.id !== id))
    }
  }

  async function toggleStatus(client: Client) {
    const res = await fetch('/api/admin/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: client.id, is_online: !client.is_online }),
    })
    if (res.ok) {
      setClients(clients.map(c => c.id === client.id ? { ...c, is_online: !c.is_online } : c))
    }
  }

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    (c.companies as any)?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">{clients.length} cadastrados</p>
        </div>
        <button
          onClick={loadClients}
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
          placeholder="Buscar por nome, email ou empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 bg-white shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-lg shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide px-4 py-3">Usuário</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide px-4 py-3">Empresa</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide px-4 py-3">Cargo</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide px-4 py-3">Cadastro</th>
                <th className="text-right text-[11px] font-medium text-slate-500 uppercase tracking-wide px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-slate-400">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                            <span className="text-[11px] font-bold text-orange-600">
                              {client.name?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          {client.is_online && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{client.name || '—'}</p>
                          <p className="text-[11px] text-slate-400">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{(client as any).companies?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {client.role || 'agent'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Wifi className={`w-3 h-3 ${client.is_online ? 'text-green-500' : 'text-slate-300'}`} />
                        <span className={`text-[11px] font-medium ${client.is_online ? 'text-green-600' : 'text-slate-400'}`}>
                          {client.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">
                      {new Date(client.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleStatus(client)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          title={client.is_online ? 'Desativar' : 'Ativar'}
                        >
                          {client.is_online ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => deleteClient(client.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
