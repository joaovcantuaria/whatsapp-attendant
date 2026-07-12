'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Users,
  Building2,
  CreditCard,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight
} from 'lucide-react'

interface Stats {
  totalClients: number
  totalCompanies: number
  activeSubscriptions: number
  totalMessages: number
  newClientsToday: number
  revenue: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    totalCompanies: 0,
    activeSubscriptions: 0,
    totalMessages: 0,
    newClientsToday: 0,
    revenue: 0,
  })
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string
    type: string
    description: string
    time: string
  }>>([])

  const supabase = createClient()

  useEffect(() => {
    loadStats()
    loadActivity()
  }, [])

  async function loadStats() {
    const { count: clientsCount } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })

    const { count: companiesCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })

    setStats({
      totalClients: clientsCount || 0,
      totalCompanies: companiesCount || 0,
      activeSubscriptions: companiesCount || 0,
      totalMessages: 0,
      newClientsToday: 0,
      revenue: 0,
    })
  }

  async function loadActivity() {
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (agents) {
      setRecentActivity(agents.map(a => ({
        id: a.id,
        type: 'cadastro',
        description: `${a.name || a.email} se cadastrou`,
        time: new Date(a.created_at).toLocaleString('pt-BR'),
      })))
    }
  }

  const cards = [
    { label: 'Total de Clientes', value: stats.totalClients, icon: Users, color: 'bg-blue-50 text-blue-600', trend: '+12%' },
    { label: 'Empresas', value: stats.totalCompanies, icon: Building2, color: 'bg-green-50 text-green-600', trend: '+5%' },
    { label: 'Assinaturas Ativas', value: stats.activeSubscriptions, icon: CreditCard, color: 'bg-purple-50 text-purple-600', trend: '+8%' },
    { label: 'Mensagens Hoje', value: stats.totalMessages, icon: MessageSquare, color: 'bg-orange-50 text-orange-600', trend: '+23%' },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Visão geral do sistema BoraGerir Chat</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
              <span className="flex items-center gap-0.5 text-xs font-medium text-green-600">
                <TrendingUp className="w-3 h-3" />
                {card.trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Atividade Recente</h2>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma atividade recente</p>
            ) : (
              recentActivity.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{item.description}</p>
                    <p className="text-xs text-gray-400">{item.time}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">
                    {item.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Ações Rápidas</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Enviar Notificação', desc: 'Para todas as empresas', color: 'bg-orange-50 hover:bg-orange-100 text-orange-700' },
              { label: 'Criar Cupom', desc: 'Desconto promocional', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
              { label: 'Enviar Email', desc: 'Comunicado geral', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
              { label: 'Nova Solução', desc: 'Adicionar funcionalidade', color: 'bg-green-50 hover:bg-green-100 text-green-700' },
              { label: 'Bloquear Empresa', desc: 'Suspender acesso', color: 'bg-red-50 hover:bg-red-100 text-red-700' },
              { label: 'Gerar Relatório', desc: 'Exportar dados', color: 'bg-gray-50 hover:bg-gray-100 text-gray-700' },
            ].map((action) => (
              <button
                key={action.label}
                className={`p-3 rounded-xl text-left transition-colors ${action.color}`}
              >
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-[11px] opacity-70">{action.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
