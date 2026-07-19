'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreditCard, Calendar, RefreshCw } from 'lucide-react'
import type { Subscription } from '@/types/billing'

interface Plan {
  id: string
  name: string
  price_monthly: number
}

interface SubscriptionStatusProps {
  subscription: (Subscription & { plan?: Plan }) | null
  onReactivate?: () => void
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  pending_cancellation: 'Cancelando',
  cancelled: 'Cancelado',
  suspended: 'Suspenso',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  pending_cancellation: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  suspended: 'bg-red-100 text-red-800 border-red-200',
}

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  elo: 'Elo',
  hipercard: 'Hipercard',
}

export function SubscriptionStatus({ subscription, onReactivate }: SubscriptionStatusProps) {
  if (!subscription) return null

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  return (
    <div className="rounded-2xl border bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Assinatura</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[subscription.status] || STATUS_COLORS.cancelled}`}>
          {STATUS_LABELS[subscription.status] || subscription.status}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Plano</span>
          <span className="font-medium">{subscription.plan?.name || '—'}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Próxima cobrança
          </span>
          <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
        </div>

        {subscription.card_last_four && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Cartão
            </span>
            <span className="font-medium">
              {CARD_BRAND_LABELS[subscription.card_brand || ''] || subscription.card_brand || 'Cartão'} •••• {subscription.card_last_four}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Ciclo</span>
          <span className="font-medium">
            {subscription.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'}
          </span>
        </div>
      </div>

      {subscription.status === 'pending_cancellation' && (
        <div className="pt-3 border-t space-y-3">
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
            <p className="text-sm text-yellow-800">
              Sua assinatura será cancelada em{' '}
              <strong>{formatDate(subscription.cancellation_effective_date)}</strong>.
              Você ainda tem acesso até essa data.
            </p>
          </div>
          {onReactivate && (
            <Button onClick={onReactivate} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reativar Assinatura
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
