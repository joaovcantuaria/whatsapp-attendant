'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Clock, Users, TrendingUp, Globe, BarChart3 } from 'lucide-react'

interface InsightStats {
  totalMessages: number
  messagesToday: number
  messagesThisWeek: number
  activeUsers: number
  totalConversations: number
  avgMessagesPerConversation: number
  messagesByHour: Array<{ hour: string; count: number }>
  topCompanies: Array<{ name: string; messages: number }>
}

export default function AdminInsights() {
  const [stats, setStats] = useState<InsightStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInsights()
  }, [])

  async function loadInsights() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        // Build insights from the stats we have
        setStats({
          totalMessages: 0,
          messagesToday: data.messagesToday || 0,
          messagesThisWeek: 0,
          activeUsers: data.onlineAgents || 0,
          totalConversations: data.totalConversations || 0,
          avgMessagesPerConversation: data.totalConversations > 0 ? Math.round(data.messagesToday / Math.max(data.totalConversations, 1)) : 0,
          messagesByHour: [],
          topCompanies: [],
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const metrics = [
    { label: 'Mensagens Hoje', value: stats?.messagesToday || 0, icon: MessageSquare, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Conversas Ativas', value: stats?.totalConversations || 0, icon: BarChart3, color: 'bg-green-500/10 text-green-600' },
    { label: 'Usuários Online', value: stats?.activeUsers || 0, icon: Users, color: 'bg-purple-500/10 text-purple-600' },
    { label: 'Média Msgs/Conversa', value: stats?.avgMessagesPerConversation || 0, icon: TrendingUp, color: 'bg-orange-500/10 text-orange-600' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Insights</h1>
        <p className="text-sm text-slate-500">Métricas e análises da plataforma</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${m.color} shadow-sm`}>
              <m.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{m.value.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-slate-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-lg shadow-slate-200/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Globe className="w-[18px] h-[18px] text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Visão Geral</h2>
            <p className="text-[11px] text-slate-400">Resumo de atividade da plataforma</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats?.totalConversations.toLocaleString('pt-BR') || 0}</p>
            <p className="text-xs text-slate-500 mt-1">Conversas totais</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats?.messagesToday || 0}</p>
            <p className="text-xs text-slate-500 mt-1">Mensagens hoje</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats?.activeUsers || 0}</p>
            <p className="text-xs text-slate-500 mt-1">Online agora</p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-700">
          <strong>Em desenvolvimento:</strong> Gráficos detalhados de mensagens por hora, tempo médio de resposta e ranking de empresas mais ativas serão implementados em breve.
        </p>
      </div>
    </div>
  )
}
