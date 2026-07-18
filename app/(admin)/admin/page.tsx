'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Building2,
  MessageSquare,
  TrendingUp,
  Activity,
  DollarSign,
  Wifi,
} from 'lucide-react'

interface Stats {
  totalCompanies: number
  activeCompanies: number
  trialCompanies: number
  totalAgents: number
  onlineAgents: number
  totalConversations: number
  messagesToday: number
  estimatedMonthlyRevenue: number
  companiesByMonth: Array<{ month: string; count: number }>
  recentAgents: Array<{
    id: string
    name: string
    email: string
    created_at: string
    is_online: boolean
    companies?: { name: string }
  }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (e) {
      console.error('Erro ao carregar stats:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const cards = [
    { label: 'Empresas', value: stats?.totalCompanies || 0, sub: `${stats?.activeCompanies || 0} ativas`, icon: Building2, gradient: 'from-blue-500 to-blue-600' },
    { label: 'Clientes', value: stats?.totalAgents || 0, sub: `${stats?.onlineAgents || 0} online`, icon: Users, gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'Conversas', value: stats?.totalConversations || 0, sub: `${stats?.messagesToday || 0} msgs hoje`, icon: MessageSquare, gradient: 'from-purple-500 to-purple-600' },
    { label: 'Receita/mês', value: `R$${(stats?.estimatedMonthlyRevenue || 0).toLocaleString('pt-BR')}`, sub: `${stats?.activeCompanies || 0} pagantes`, icon: DollarSign, gradient: 'from-orange-500 to-orange-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Visão geral da plataforma BoraGerir</p>
      </div>

      {/* Stat cards — flutuantes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3 shadow-md`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.label}</p>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Growth chart — flutuante */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-lg shadow-slate-200/50">
          <h2 className="text-sm font-semibold text-slate-900 mb-5">Crescimento (empresas/mês)</h2>
          {stats?.companiesByMonth && stats.companiesByMonth.length > 0 ? (
            <div className="flex items-end gap-2 h-36">
              {stats.companiesByMonth.map((item) => {
                const max = Math.max(...stats.companiesByMonth.map(i => i.count))
                const height = max > 0 ? (item.count / max) * 100 : 0
                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold">{item.count}</span>
                    <div
                      className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-lg hover:from-orange-600 hover:to-orange-500 transition-all shadow-sm min-h-[6px]"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-slate-400">
                      {item.month.slice(5)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">Sem dados de crescimento</p>
          )}
        </div>

        {/* Recent activity — flutuante */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-lg shadow-slate-200/50">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-900">Últimos Cadastros</h2>
            <Activity className="w-4 h-4 text-slate-300" />
          </div>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {stats?.recentAgents && stats.recentAgents.length > 0 ? (
              stats.recentAgents.slice(0, 10).map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm">
                      <span className="text-[11px] font-bold text-white">
                        {agent.name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    {agent.is_online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-sm" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{agent.name || agent.email}</p>
                    <p className="text-[10px] text-slate-400">
                      {(agent as any).companies?.name || 'Sem empresa'} · {new Date(agent.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Wifi className={`w-3.5 h-3.5 ${agent.is_online ? 'text-green-500' : 'text-slate-200'}`} />
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Nenhum cadastro recente</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary — flutuante */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <p className="text-2xl font-bold text-emerald-600">{stats?.activeCompanies || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Ativas</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <p className="text-2xl font-bold text-amber-600">{stats?.trialCompanies || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Em Trial</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <p className="text-2xl font-bold text-blue-600">{stats?.onlineAgents || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Online Agora</p>
        </div>
      </div>
    </div>
  )
}
