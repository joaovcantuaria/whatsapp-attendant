'use client'

import { useState, useEffect } from 'react'
import { Star, TrendingUp, TrendingDown, Users, RefreshCw, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'

interface Rating {
  id: string
  contact_name: string | null
  contact_phone: string
  rating: number
  feedback: string | null
  rated_at: string
  conversation_id: string | null
}

interface Metrics {
  total: number
  average: number
  nps: number
  promoters: number
  detractors: number
  neutral: number
  distribution: Array<{ rating: number; count: number; percentage: number }>
}

export default function SatisfactionPage() {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    loadData()
  }, [period])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/satisfaction?period=${period}`)
      if (res.ok) {
        const data = await res.json()
        setRatings(data.ratings)
        setMetrics(data.metrics)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function renderStars(rating: number) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
          />
        ))}
      </div>
    )
  }

  function getNpsColor(nps: number) {
    if (nps >= 50) return 'text-emerald-600'
    if (nps >= 0) return 'text-amber-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Avaliações de Satisfação</h1>
          <p className="text-sm text-slate-500">Feedback dos seus clientes via WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400 bg-white"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
          </select>
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Média */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mb-3 shadow-md">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{metrics.average}</p>
            <p className="text-xs text-slate-400 mt-0.5">Média geral</p>
            <div className="mt-2">{renderStars(Math.round(metrics.average))}</div>
          </div>

          {/* Total */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 shadow-md">
              <Users className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{metrics.total}</p>
            <p className="text-xs text-slate-400 mt-0.5">Avaliações recebidas</p>
          </div>

          {/* NPS */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-3 shadow-md">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <p className={`text-3xl font-bold ${getNpsColor(metrics.nps)}`}>{metrics.nps}</p>
            <p className="text-xs text-slate-400 mt-0.5">NPS Score</p>
            <p className="text-[10px] text-slate-400 mt-1">
              {metrics.nps >= 50 ? 'Excelente' : metrics.nps >= 0 ? 'Bom' : 'Precisa melhorar'}
            </p>
          </div>

          {/* Promotores */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-600">{metrics.promoters}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Minus className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-amber-600">{metrics.neutral}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ThumbsDown className="w-4 h-4 text-red-500" />
                <span className="text-sm font-bold text-red-600">{metrics.detractors}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">Promotores · Neutros · Detratores</p>
          </div>
        </div>
      )}

      {/* Distribution chart */}
      {metrics && metrics.total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-lg shadow-slate-200/50">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Distribuição das Notas</h2>
          <div className="space-y-3">
            {metrics.distribution.slice().reverse().map((d) => (
              <div key={d.rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16 shrink-0">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium text-slate-700">{d.rating}</span>
                </div>
                <div className="flex-1 h-7 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      d.rating >= 4 ? 'bg-emerald-400' : d.rating === 3 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${d.percentage}%` }}
                  />
                </div>
                <div className="w-16 text-right shrink-0">
                  <span className="text-sm font-medium text-slate-600">{d.count}</span>
                  <span className="text-[10px] text-slate-400 ml-1">({d.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ratings list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Avaliações Recentes</h2>
        </div>
        {ratings.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Nenhuma avaliação recebida neste período</p>
            <p className="text-xs text-slate-300 mt-1">
              Envie uma pesquisa de satisfação e as respostas aparecerão aqui automaticamente
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {ratings.map((r) => (
              <div key={r.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-xs font-bold text-white">
                    {r.contact_name?.[0]?.toUpperCase() || r.contact_phone?.slice(-2) || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {r.contact_name || r.contact_phone}
                    </p>
                    {renderStars(r.rating)}
                  </div>
                  {r.feedback && r.feedback.length > 1 && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{r.feedback}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-bold ${
                    r.rating >= 4 ? 'text-emerald-600' : r.rating === 3 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {r.rating}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(r.rated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
