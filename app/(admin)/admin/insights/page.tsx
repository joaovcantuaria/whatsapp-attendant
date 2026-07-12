'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { BarChart3, TrendingUp, Users, MessageSquare, Clock, Globe } from 'lucide-react'

export default function AdminInsights() {
  const [stats, setStats] = useState({
    totalMessages: 0,
    avgResponseTime: '2m 34s',
    activeUsers: 0,
    peakHour: '14:00',
    topDepartment: 'Comercial',
    conversionRate: '12%',
  })
  const supabase = createClient()

  useEffect(() => {
    loadInsights()
  }, [])

  async function loadInsights() {
    const { count: usersCount } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true)

    setStats(prev => ({ ...prev, activeUsers: usersCount || 0 }))
  }

  const metrics = [
    { label: 'Mensagens Totais', value: '45.2K', change: '+18%', icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
    { label: 'Tempo Médio Resposta', value: stats.avgResponseTime, change: '-12%', icon: Clock, color: 'text-green-600 bg-green-50' },
    { label: 'Usuários Ativos', value: stats.activeUsers.toString(), change: '+5%', icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: 'Taxa de Conversão', value: stats.conversionRate, change: '+3%', icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
  ]

  const hourlyData = [
    { hour: '06h', value: 12 }, { hour: '07h', value: 25 }, { hour: '08h', value: 45 },
    { hour: '09h', value: 78 }, { hour: '10h', value: 92 }, { hour: '11h', value: 85 },
    { hour: '12h', value: 60 }, { hour: '13h', value: 55 }, { hour: '14h', value: 95 },
    { hour: '15h', value: 88 }, { hour: '16h', value: 76 }, { hour: '17h', value: 65 },
    { hour: '18h', value: 42 }, { hour: '19h', value: 30 }, { hour: '20h', value: 18 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-sm text-gray-500">Métricas e análises do sistema</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${m.color}`}>
              <m.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-gray-900">{m.value}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">{m.label}</p>
              <span className="text-[10px] font-medium text-green-600">{m.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-gray-900">Mensagens por Hora</h2>
            <p className="text-xs text-gray-400">Distribuição de atividade ao longo do dia</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Globe className="w-3.5 h-3.5" />
            Horário pico: {stats.peakHour}
          </div>
        </div>
        {/* Simple bar chart */}
        <div className="flex items-end gap-1.5 h-40">
          {hourlyData.map((d) => (
            <div key={d.hour} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-[#F26522]/20 hover:bg-[#F26522]/40 rounded-t transition-colors"
                style={{ height: `${d.value}%` }}
              />
              <span className="text-[9px] text-gray-400">{d.hour}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Additional stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Top Departamentos</h3>
          <div className="space-y-3">
            {[
              { name: 'Comercial', percent: 45 },
              { name: 'Suporte', percent: 30 },
              { name: 'Financeiro', percent: 15 },
              { name: 'Outros', percent: 10 },
            ].map((dept) => (
              <div key={dept.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{dept.name}</span>
                  <span className="text-gray-400">{dept.percent}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full bg-[#F26522] rounded-full" style={{ width: `${dept.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Satisfação por Período</h3>
          <div className="space-y-3">
            {[
              { period: 'Última semana', score: 94 },
              { period: 'Último mês', score: 91 },
              { period: 'Último trimestre', score: 88 },
              { period: 'Todo o período', score: 89 },
            ].map((item) => (
              <div key={item.period} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{item.period}</span>
                <span className={`text-sm font-medium ${item.score >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {item.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
