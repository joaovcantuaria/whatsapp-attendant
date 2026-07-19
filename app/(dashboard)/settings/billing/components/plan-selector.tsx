'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Check, Crown } from 'lucide-react'

interface Plan {
  id: string
  name: string
  price_monthly: number
  price_yearly: number | null
  max_agents: number
  max_conversations_per_month: number
  max_contacts: number
  features: string[] | null
  is_active: boolean
}

interface PlanSelectorProps {
  currentPlanId: string | null
  onSelectPlan: (planId: string) => void
  currentPeriodEnd?: string | null
  billingCycle?: 'monthly' | 'yearly'
}

export function PlanSelector({ currentPlanId, onSelectPlan, currentPeriodEnd, billingCycle = 'monthly' }: PlanSelectorProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch('/api/admin/plans')
        if (res.ok) {
          const data = await res.json()
          setPlans(data.filter((p: Plan) => p.is_active))
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

  const handleSelect = (planId: string) => {
    if (planId === currentPlanId) return
    setSelectedPlanId(planId)
    onSelectPlan(planId)
  }

  const getPrice = (plan: Plan) => {
    if (billingCycle === 'yearly' && plan.price_yearly) {
      return plan.price_yearly
    }
    return plan.price_monthly
  }

  const getPriceLabel = (plan: Plan) => {
    if (billingCycle === 'yearly' && plan.price_yearly) {
      return `R$ ${plan.price_yearly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano`
    }
    return `R$ ${plan.price_monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`
  }

  // Determine if selecting a plan would be upgrade or downgrade
  const getChangeType = (plan: Plan): 'upgrade' | 'downgrade' | 'current' => {
    if (plan.id === currentPlanId) return 'current'
    const currentPlan = plans.find(p => p.id === currentPlanId)
    if (!currentPlan) return 'upgrade'
    return plan.price_monthly > currentPlan.price_monthly ? 'upgrade' : 'downgrade'
  }

  // Price difference preview (task 5.6)
  const renderPricePreview = () => {
    if (!selectedPlanId || selectedPlanId === currentPlanId) return null
    const newPlan = plans.find(p => p.id === selectedPlanId)
    const currentPlan = plans.find(p => p.id === currentPlanId)
    if (!newPlan || !currentPlan) return null

    const changeType = getChangeType(newPlan)
    const newPrice = getPrice(newPlan)
    const oldPrice = getPrice(currentPlan)

    if (changeType === 'upgrade') {
      // Calculate prorated amount
      if (currentPeriodEnd) {
        const now = new Date()
        const periodEnd = new Date(currentPeriodEnd)
        const totalDays = billingCycle === 'yearly' ? 365 : 30
        const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        const prorated = ((newPrice - oldPrice) * daysRemaining) / totalDays
        return (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            Valor proporcional: <strong>R$ {prorated.toFixed(2).replace('.', ',')}</strong> (cobrança imediata)
          </div>
        )
      }
      return (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          Upgrade imediato para <strong>R$ {newPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{billingCycle === 'yearly' ? 'ano' : 'mês'}</strong>
        </div>
      )
    }

    if (changeType === 'downgrade' && currentPeriodEnd) {
      const periodEnd = new Date(currentPeriodEnd)
      const dateStr = periodEnd.toLocaleDateString('pt-BR')
      return (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
          Novo valor a partir de {dateStr}: <strong>R$ {newPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{billingCycle === 'yearly' ? 'ano' : 'mês'}</strong>
        </div>
      )
    }

    return null
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-64 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map(plan => {
          const isCurrent = plan.id === currentPlanId
          const isSelected = plan.id === selectedPlanId

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 bg-white p-6 transition-all cursor-pointer ${
                isCurrent
                  ? 'border-orange-400 shadow-md'
                  : isSelected
                  ? 'border-orange-300 shadow-sm'
                  : 'border-gray-200 hover:border-orange-200'
              }`}
              onClick={() => handleSelect(plan.id)}
            >
              {isCurrent && (
                <Badge className="absolute -top-3 left-4 bg-orange-500 text-white">
                  <Crown className="h-3 w-3 mr-1" />
                  Plano Atual
                </Badge>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="text-2xl font-bold text-orange-600 mt-2">
                    {getPriceLabel(plan)}
                  </p>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Agentes</span>
                    <span className="font-medium text-foreground">{plan.max_agents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conversas/mês</span>
                    <span className="font-medium text-foreground">{plan.max_conversations_per_month.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contatos</span>
                    <span className="font-medium text-foreground">{plan.max_contacts.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-1.5 text-sm">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  className="w-full"
                  variant={isCurrent ? 'secondary' : 'default'}
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Plano Atual' : 'Selecionar'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {renderPricePreview()}
    </div>
  )
}
