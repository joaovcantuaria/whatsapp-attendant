'use client'

import { useState } from 'react'
import { Plus, Ticket, Copy, Trash2, Edit } from 'lucide-react'

interface Coupon {
  id: string
  code: string
  discount: number
  type: 'percent' | 'fixed'
  maxUses: number
  usedCount: number
  expiresAt: string
  active: boolean
}

const defaultCoupons: Coupon[] = [
  { id: '1', code: 'BEMVINDO20', discount: 20, type: 'percent', maxUses: 100, usedCount: 34, expiresAt: '2026-12-31', active: true },
  { id: '2', code: 'PROMO50', discount: 50, type: 'fixed', maxUses: 50, usedCount: 12, expiresAt: '2026-08-31', active: true },
  { id: '3', code: 'PARCEIRO30', discount: 30, type: 'percent', maxUses: 200, usedCount: 67, expiresAt: '2027-01-31', active: true },
]

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>(defaultCoupons)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ code: '', discount: '', type: 'percent' as const, maxUses: '', expiresAt: '' })

  function createCoupon() {
    setCoupons([...coupons, {
      id: Date.now().toString(),
      code: formData.code.toUpperCase(),
      discount: Number(formData.discount),
      type: formData.type,
      maxUses: Number(formData.maxUses),
      usedCount: 0,
      expiresAt: formData.expiresAt,
      active: true,
    }])
    setShowForm(false)
    setFormData({ code: '', discount: '', type: 'percent', maxUses: '', expiresAt: '' })
  }

  function deleteCoupon(id: string) {
    if (confirm('Excluir este cupom?')) {
      setCoupons(coupons.filter(c => c.id !== id))
    }
  }

  function toggleCoupon(id: string) {
    setCoupons(coupons.map(c => c.id === id ? { ...c, active: !c.active } : c))
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupons</h1>
          <p className="text-sm text-gray-500">Gerencie cupons de desconto</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F26522] text-white rounded-lg text-sm font-medium hover:bg-[#d4561c] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Cupom
        </button>
      </div>

      {/* Coupons list */}
      <div className="grid gap-3">
        {coupons.map((coupon) => (
          <div key={coupon.id} className={`bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 ${
            !coupon.active ? 'opacity-60' : ''
          }`}>
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <code className="text-sm font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded">{coupon.code}</code>
                <button onClick={() => copyCode(coupon.code)} className="text-gray-400 hover:text-gray-600">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {coupon.type === 'percent' ? `${coupon.discount}% off` : `R$${coupon.discount} off`}
                {' · '}Usado {coupon.usedCount}/{coupon.maxUses}
                {' · '}Expira {new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              coupon.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {coupon.active ? 'Ativo' : 'Inativo'}
            </span>
            <div className="flex gap-1">
              <button onClick={() => toggleCoupon(coupon.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 text-xs">
                {coupon.active ? 'Desativar' : 'Ativar'}
              </button>
              <button onClick={() => deleteCoupon(coupon.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Novo Cupom</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Código</label>
                <input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522] uppercase"
                  placeholder="PROMO20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Desconto</label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percent' | 'fixed' })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522]"
                  >
                    <option value="percent">Porcentagem (%)</option>
                    <option value="fixed">Valor fixo (R$)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Limite de uso</label>
                  <input
                    type="number"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Expira em</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={createCoupon} className="flex-1 px-4 py-2 rounded-lg bg-[#F26522] text-white text-sm font-medium hover:bg-[#d4561c]">
                Criar Cupom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
