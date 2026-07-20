'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, X, Tag } from 'lucide-react'

interface CouponData {
  code: string
  discount: number
  type: 'percent' | 'fixed'
}

interface CouponInputProps {
  onApply: (coupon: CouponData) => void
  onRemove: () => void
  appliedCoupon: CouponData | null
}

export function CouponInput({ onApply, onRemove, appliedCoupon }: CouponInputProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    if (!code.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/billing/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })

      const data = await res.json()

      if (data.valid) {
        onApply({ code: data.code, discount: data.discount, type: data.type })
        setCode('')
      } else {
        setError(data.error || 'Cupom inválido ou expirado')
      }
    } catch {
      setError('Erro ao validar cupom. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleApply()
    }
  }

  const formatDiscount = (coupon: CouponData) => {
    if (coupon.type === 'percent') {
      return `-${coupon.discount}%`
    }
    return `-R$${coupon.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  // Show applied coupon state
  if (appliedCoupon) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-sm">
          <Tag className="h-3.5 w-3.5 text-green-600" />
          <span className="font-medium text-green-700">
            {appliedCoupon.code} aplicado! {formatDiscount(appliedCoupon)}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="ml-1 rounded-full p-0.5 hover:bg-green-100 transition-colors"
            aria-label="Remover cupom"
          >
            <X className="h-3.5 w-3.5 text-green-600" />
          </button>
        </div>
      </div>
    )
  }

  // Show input form
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Código do cupom"
          className="flex-1"
          disabled={isLoading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleApply}
          disabled={isLoading || !code.trim()}
          className="shrink-0 px-4"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
