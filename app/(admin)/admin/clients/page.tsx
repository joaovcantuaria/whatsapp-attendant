'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, MoreVertical, Edit, Trash2, Mail, Ban, CheckCircle } from 'lucide-react'

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
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    setLoading(true)
    const { data } = await supabase
      .from('agents')
      .select('*, companies(name)')
      .order('created_at', { ascending: false })

    setClients(data || [])
    setLoading(false)
  }

  async function deleteClient(id: string) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return
    await supabase.from('agents').delete().eq('id', id)
    setClients(clients.filter(c => c.id !== id))
  }

  async function toggleStatus(client: Client) {
    const newStatus = !client.is_online
    await supabase.from('agents').update({ is_online: newStatus }).eq('id', client.id)
    setClients(clients.map(c => c.id === client.id ? { ...c, is_online: newStatus } : c))
  }

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">{clients.length} clientes cadastrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522]/20"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Nome</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Email</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Empresa</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Cargo</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Cadastro</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-gray-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-gray-400">Nenhum cliente encontrado</td></tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#F26522]/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-[#F26522]">
                            {client.name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{client.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{client.email}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{(client as any).companies?.name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{client.role || 'agent'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        client.is_online ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {client.is_online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {new Date(client.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleStatus(client)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                          title={client.is_online ? 'Desativar' : 'Ativar'}
                        >
                          {client.is_online ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => deleteClient(client.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
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
