'use client'

import { useState, useEffect } from 'react'
import { Plus, Ticket, Copy, Trash2, RefreshCw } from 'lucide-react'

interface Coupon {
  id: string
  code: string
  discount: number
  type: 'percent' | 'fixed'
  max_uses: number
  used_count: number
  expires_at: string
  is_active: boolean
  created_at: string
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ code: '', discount: '', type: 'percent' as 'percent' | 'fixed', max_uses: '100', expires_at: '' })

  useEffect(() => {
    loadCoupons()
  }, [])

  async function loadCoupons() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/coupons')
      if (res.ok) {
        const data = await res.json()
        setCoupons(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function createCoupon() {
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: formData.code,
        discount: Number(formData.discount),
        type: formData.type,
        max_uses: Number(formData.max_uses),
        expires_at: formData.expires_at || null,
      }),
    })
    if (res.ok) {
      await loadCoupons()
      setShowForm(false)
      setFormData({ code: '', discount: '', type: 'percent', max_uses: '100', expires_at: '' })
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao criar cupom')
    }
  }

  async function toggleCoupon(coupon: Coupon) {
    const res = await fetch('/api/admin/coupons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: coupon.id, is_active: !coupon.is_active }),
    })
    if (res.ok) {
      setCoupons(coupons.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
    }
  }

  async function deleteCoupon(id: string) {
    if (!confirm('Excluir este cupom permanentemente?')) return
    const res = await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCoupons(coupons.filter(c => c.id !== id))
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cupons</h1>
          <p className="text-sm text-slate-500">Gerencie cupons de desconto</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Cupom
        </button>
      </div>

      {/* Coupons list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-400">Nenhum cupom cadastrado</div>
      ) : (
        <div className="space-y-2">
          {coupons.map((coupon) => (
            <div key={coupon.id} className={`bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 transition-all duration-200 ${
              !coupon.is_active ? 'opacity-50 shadow-md' : 'shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-0.5'
            }`}>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Ticket className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-lg">{coupon.code}</code>
                  <button onClick={() => copyCode(coupon.code)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {coupon.type === 'percent' ? `${coupon.discount}% off` : `R$${coupon.discount} off`}
                  {' · '}Usado {coupon.used_count}/{coupon.max_uses}
                  {coupon.expires_at && ` · Expira ${new Date(coupon.expires_at).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                coupon.is_active ? 'bg-green-500/10 text-green-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {coupon.is_active ? 'Ativo' : 'Inativo'}
              </span>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => toggleCoupon(coupon)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  {coupon.is_active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => deleteCoupon(coupon.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-base font-bold text-slate-900 mb-4">Novo Cupom</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Código</label>
                <input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400 uppercase"
                  placeholder="PROMO20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Desconto</label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percent' | 'fixed' })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                  >
                    <option value="percent">Porcentagem (%)</option>
                    <option value="fixed">Valor fixo (R$)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Limite de uso</label>
                  <input
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Expira em</label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={createCoupon} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">
                Criar Cupom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
