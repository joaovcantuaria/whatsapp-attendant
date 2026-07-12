'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Activity, UserPlus, LogIn, CreditCard, ShoppingCart, RefreshCw } from 'lucide-react'

interface ActivityEvent {
  id: string
  type: 'login' | 'register' | 'purchase' | 'subscription'
  user: string
  description: string
  timestamp: string
}

export default function AdminActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadActivity()
  }, [])

  async function loadActivity() {
    setLoading(true)
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, email, created_at, is_online')
      .order('created_at', { ascending: false })
      .limit(50)

    if (agents) {
      const mapped: ActivityEvent[] = agents.map(a => ({
        id: a.id,
        type: 'register' as const,
        user: a.name || a.email,
        description: `Novo cadastro: ${a.email}`,
        timestamp: a.created_at,
      }))
      setEvents(mapped)
    }
    setLoading(false)
  }

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

  const typeConfig: Record<string, { icon: typeof Activity; color: string; label: string }> = {
    login: { icon: LogIn, color: 'bg-blue-50 text-blue-600', label: 'Login' },
    register: { icon: UserPlus, color: 'bg-green-50 text-green-600', label: 'Cadastro' },
    purchase: { icon: ShoppingCart, color: 'bg-purple-50 text-purple-600', label: 'Compra' },
    subscription: { icon: CreditCard, color: 'bg-orange-50 text-orange-600', label: 'Assinatura' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimentações</h1>
          <p className="text-sm text-gray-500">Logins, cadastros, compras e atividades ao vivo</p>
        </div>
        <button
          onClick={loadActivity}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'Tudo' },
          { value: 'register', label: 'Cadastros' },
          { value: 'login', label: 'Logins' },
          { value: 'purchase', label: 'Compras' },
          { value: 'subscription', label: 'Assinaturas' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-[#F26522] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span>Monitorando em tempo real</span>
      </div>

      {/* Events list */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Nenhuma movimentação encontrada</div>
        ) : (
          filtered.map((event) => {
            const config = typeConfig[event.type] || typeConfig.register
            const Icon = config.icon
            return (
              <div key={event.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{event.description}</p>
                  <p className="text-xs text-gray-400">{event.user}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(event.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
