'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/hooks/use-company'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { SettingsBack } from '@/components/shared/settings-back'
import { XCircle } from 'lucide-react'
import type { Subscription } from '@/types/billing'

import { TrialBanner } from './components/trial-banner'
import { SuspendedBanner } from './components/suspended-banner'
import { SubscriptionStatus } from './components/subscription-status'
import { PlanSelector } from './components/plan-selector'
import { PaymentForm } from './components/payment-form'
import { PixPayment } from './components/pix-payment'
import { PaymentHistory } from './components/payment-history'
import { CancelDialog } from './components/cancel-dialog'

interface SubscriptionWithPlan extends Subscription {
  plan?: { id: string; name: string; price_monthly: number; price_yearly?: number | null }
}

export default function BillingPage() {
  const { company, plan, membership, trialDaysLeft, refetch } = useCompany()
  const { toast } = useToast()

  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(null)
  const [loadingSub, setLoadingSub] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card')
  const [allPlans, setAllPlans] = useState<Array<{ id: string; name: string; price_monthly: number; price_yearly?: number | null }>>([])

  // Task 9.2: Role-based access (fallback to true if no membership data available)
  const isAdmin = !membership || membership?.role === 'admin' || membership?.role === 'owner'
  const planStatus = company?.plan_status || 'trial'

  // Fetch subscription state on mount
  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/subscription')
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription || null)
      }
    } catch {
      // silently fail
    } finally {
      setLoadingSub(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscription()
    // Fetch all plans for payment form
    fetch('/api/billing/plans').then(res => res.ok ? res.json() : []).then(data => {
      setAllPlans(Array.isArray(data) ? data.map((p: any) => ({ id: p.id, name: p.name, price_monthly: p.price_monthly ?? 0, price_yearly: p.price_yearly ?? null })) : [])
    }).catch(() => {})
  }, [fetchSubscription])

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId)
    if (!subscription || subscription.status === 'cancelled') {
      setShowPaymentForm(true)
    }
  }

  const handlePaymentSuccess = async () => {
    await fetchSubscription()
    await refetch()
    setShowPaymentForm(false)
    toast({ title: 'Assinatura ativada com sucesso!' })
  }

  const handleChangePlan = async (planId: string) => {
    if (!subscription || subscription.status !== 'active') {
      // No active subscription — show payment form
      setSelectedPlanId(planId)
      setShowPaymentForm(true)
      return
    }

    // Active subscription — change plan via API
    try {
      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_plan_id: planId,
          billing_cycle: subscription.billing_cycle || 'monthly',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.type === 'upgrade') {
          toast({
            title: 'Plano atualizado!',
            description: data.prorated_amount
              ? `Cobrança proporcional: R$ ${data.prorated_amount.toFixed(2).replace('.', ',')}`
              : `Seu plano agora é ${data.new_plan.name}`,
          })
        } else {
          toast({
            title: 'Downgrade agendado',
            description: `Seu plano será alterado para ${data.new_plan.name} ao final do período atual.`,
          })
        }
        await fetchSubscription()
        await refetch()
      } else {
        const err = await res.json().catch(() => null)
        toast({
          variant: 'destructive',
          title: 'Erro ao alterar plano',
          description: err?.error || 'Tente novamente.',
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro de conexão. Tente novamente.',
      })
    }
  }

  // Task 9.4: Cancel action with toast
  const handleCancel = async () => {
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      if (res.ok) {
        toast({ title: 'Assinatura cancelada', description: 'Seu acesso continua ativo até o final do período.' })
        await fetchSubscription()
        await refetch()
        setCancelDialogOpen(false)
      } else {
        const err = await res.json().catch(() => null)
        toast({
          variant: 'destructive',
          title: 'Erro ao cancelar',
          description: err?.error || 'Tente novamente.',
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro de conexão. Tente novamente.',
      })
    }
  }

  // Task 9.4: Reactivate action with toast
  const handleReactivate = async () => {
    try {
      const res = await fetch('/api/billing/reactivate', { method: 'POST' })
      if (res.ok) {
        toast({ title: 'Assinatura reativada!' })
        await fetchSubscription()
        await refetch()
      } else {
        const err = await res.json().catch(() => null)
        toast({
          variant: 'destructive',
          title: 'Erro ao reativar',
          description: err?.error || 'Tente novamente.',
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro de conexão. Tente novamente.',
      })
    }
  }

  if (loadingSub) {
    return (
      <div className="p-6 space-y-6 h-full overflow-y-auto max-w-4xl mx-auto">
        <SettingsBack />
        <h1 className="text-2xl font-bold">Faturamento</h1>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto max-w-4xl mx-auto">
      <SettingsBack />
      <h1 className="text-2xl font-bold">Faturamento</h1>

      {/* Trial state: show trial banner + plan selector + payment form */}
      {planStatus === 'trial' && (
        <>
          <TrialBanner
            trialEndDate={company?.trial_ends_at || new Date().toISOString()}
            onActivate={() => setShowPaymentForm(true)}
          />
          <PlanSelector
            currentPlanId={company?.plan_id || null}
            onSelectPlan={handleSelectPlan}
            billingCycle="monthly"
          />
          {showPaymentForm && selectedPlanId && (
            <div className="space-y-4">
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    paymentMethod === 'card'
                      ? 'bg-white text-foreground shadow-sm border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Cartão de Crédito
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    paymentMethod === 'pix'
                      ? 'bg-white text-foreground shadow-sm border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  PIX
                </button>
              </div>
              {paymentMethod === 'card' && (
                <PaymentForm
                  plans={allPlans}
                  selectedPlanId={selectedPlanId}
                  onSuccess={handlePaymentSuccess}
                  payerEmail={company?.email || ''}
                />
              )}
              {paymentMethod === 'pix' && selectedPlanId && (
                <PixPayment
                  planId={selectedPlanId}
                  planName={allPlans.find(p => p.id === selectedPlanId)?.name || ''}
                  amount={allPlans.find(p => p.id === selectedPlanId)?.price_monthly || 0}
                  payerEmail={company?.email || ''}
                  billingCycle="monthly"
                  onSuccess={handlePaymentSuccess}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Suspended state: show suspended banner + plan selector + payment form */}
      {planStatus === 'suspended' && (
        <>
          <SuspendedBanner onActivate={() => setShowPaymentForm(true)} />
          {isAdmin && (
            <>
              <PlanSelector
                currentPlanId={company?.plan_id || null}
                onSelectPlan={handleSelectPlan}
                billingCycle="monthly"
              />
              {showPaymentForm && selectedPlanId && (
                <div className="space-y-4">
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        paymentMethod === 'card'
                          ? 'bg-white text-foreground shadow-sm border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Cartão de Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        paymentMethod === 'pix'
                          ? 'bg-white text-foreground shadow-sm border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      PIX
                    </button>
                  </div>
                  {paymentMethod === 'card' && (
                    <PaymentForm
                      plans={allPlans}
                      selectedPlanId={selectedPlanId}
                      onSuccess={handlePaymentSuccess}
                      payerEmail={company?.email || ''}
                    />
                  )}
                  {paymentMethod === 'pix' && selectedPlanId && (
                    <PixPayment
                      planId={selectedPlanId}
                      planName={allPlans.find(p => p.id === selectedPlanId)?.name || ''}
                      amount={allPlans.find(p => p.id === selectedPlanId)?.price_monthly || 0}
                      payerEmail={company?.email || ''}
                      billingCycle="monthly"
                      onSuccess={handlePaymentSuccess}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Active subscription: show status + plan selector (upgrade/downgrade) + history + cancel */}
      {planStatus === 'active' && subscription?.status === 'active' && (
        <>
          <SubscriptionStatus subscription={subscription} />

          {isAdmin && (
            <>
              <PlanSelector
                currentPlanId={subscription.plan_id}
                onSelectPlan={handleChangePlan}
                currentPeriodEnd={subscription.current_period_end}
                billingCycle={subscription.billing_cycle}
              />

              <PaymentHistory />

              <div className="rounded-2xl border bg-white p-6">
                <h3 className="text-lg font-semibold mb-2">Cancelar Assinatura</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ao cancelar, seu acesso continua até o final do período de cobrança atual.
                </p>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar Assinatura
                </Button>
              </div>

              <CancelDialog
                periodEndDate={subscription.current_period_end || new Date().toISOString()}
                onConfirm={handleCancel}
                open={cancelDialogOpen}
                onOpenChange={setCancelDialogOpen}
              />
            </>
          )}

          {/* Read-only for non-admins (task 9.2) */}
          {!isAdmin && <PaymentHistory />}
        </>
      )}

      {/* Pending cancellation: show status with reactivate + history */}
      {subscription?.status === 'pending_cancellation' && (
        <>
          <SubscriptionStatus
            subscription={subscription}
            onReactivate={isAdmin ? handleReactivate : undefined}
          />
          <PaymentHistory />
        </>
      )}

      {/* No subscription / cancelled: show plan selector + payment form */}
      {planStatus === 'active' && !subscription && (
        <>
          {isAdmin && (
            <>
              <PlanSelector
                currentPlanId={company?.plan_id || null}
                onSelectPlan={handleSelectPlan}
                billingCycle="monthly"
              />
              {showPaymentForm && selectedPlanId && (
                <div className="space-y-4">
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        paymentMethod === 'card'
                          ? 'bg-white text-foreground shadow-sm border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Cartão de Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        paymentMethod === 'pix'
                          ? 'bg-white text-foreground shadow-sm border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      PIX
                    </button>
                  </div>
                  {paymentMethod === 'card' && (
                    <PaymentForm
                      plans={allPlans}
                      selectedPlanId={selectedPlanId}
                      onSuccess={handlePaymentSuccess}
                      payerEmail={company?.email || ''}
                    />
                  )}
                  {paymentMethod === 'pix' && selectedPlanId && (
                    <PixPayment
                      planId={selectedPlanId}
                      planName={allPlans.find(p => p.id === selectedPlanId)?.name || ''}
                      amount={allPlans.find(p => p.id === selectedPlanId)?.price_monthly || 0}
                      payerEmail={company?.email || ''}
                      billingCycle="monthly"
                      onSuccess={handlePaymentSuccess}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {planStatus === 'cancelled' && (
        <>
          {isAdmin && (
            <>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
                <p className="text-muted-foreground">Sua assinatura foi cancelada. Selecione um plano para reativar.</p>
              </div>
              <PlanSelector
                currentPlanId={null}
                onSelectPlan={handleSelectPlan}
                billingCycle="monthly"
              />
              {showPaymentForm && selectedPlanId && (
                <div className="space-y-4">
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        paymentMethod === 'card'
                          ? 'bg-white text-foreground shadow-sm border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Cartão de Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        paymentMethod === 'pix'
                          ? 'bg-white text-foreground shadow-sm border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      PIX
                    </button>
                  </div>
                  {paymentMethod === 'card' && (
                    <PaymentForm
                      plans={allPlans}
                      selectedPlanId={selectedPlanId}
                      onSuccess={handlePaymentSuccess}
                      payerEmail={company?.email || ''}
                    />
                  )}
                  {paymentMethod === 'pix' && selectedPlanId && (
                    <PixPayment
                      planId={selectedPlanId}
                      planName={allPlans.find(p => p.id === selectedPlanId)?.name || ''}
                      amount={allPlans.find(p => p.id === selectedPlanId)?.price_monthly || 0}
                      payerEmail={company?.email || ''}
                      billingCycle="monthly"
                      onSuccess={handlePaymentSuccess}
                    />
                  )}
                </div>
              )}
            </>
          )}
          <PaymentHistory />
        </>
      )}
    </div>
  )
}
