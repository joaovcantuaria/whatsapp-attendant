'use client'

import { useState, useEffect } from 'react'
import { Activity, UserPlus, Building2, RefreshCw, Wifi } from 'lucide-react'

interface ActivityEvent {
  id: string
  type: 'register' | 'company_created'
  name: string
  email: string
  company?: string
  is_online: boolean
  timestamp: string
}

export default function AdminActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActivity()
  }, [])

  async function loadActivity() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        const mapped: ActivityEvent[] = (data.recentAgents || []).map((a: any) => ({
          id: a.id,
          type: 'register' as const,
          name: a.name || a.email,
          email: a.email,
          company: a.companies?.name,
          is_online: a.is_online,
          timestamp: a.created_at,
        }))
        setEvents(mapped)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Movimentações</h1>
          <p className="text-sm text-slate-500">Cadastros e atividades recentes na plataforma</p>
        </div>
        <button
          onClick={loadActivity}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span>Últimos cadastros na plataforma</span>
      </div>

      {/* Events list */}
      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 shadow-lg shadow-slate-200/50">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Nenhuma movimentação encontrada</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-500/10 shrink-0">
                <UserPlus className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 font-medium truncate">{event.name}</p>
                <p className="text-[11px] text-slate-400">
                  {event.email}
                  {event.company && ` · ${event.company}`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Wifi className={`w-3 h-3 ${event.is_online ? 'text-green-500' : 'text-slate-300'}`} />
                <div className="text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-500/10 text-green-600">
                    Cadastro
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(event.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
