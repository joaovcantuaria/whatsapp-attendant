'use client'

import { useState, useCallback, useEffect } from 'react'
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import type { BillingCycle } from '@/types/billing'

// Task 4.1: Initialize MercadoPago SDK at module level
initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!)

// Task 4.3: Card validation error messages in Portuguese
const CARD_VALIDATION_ERRORS: Record<string, string> = {
  cardNumber: 'Número do cartão inválido',
  expirationDate: 'Data de validade inválida',
  securityCode: 'CVV incorreto',
  cardholderName: 'Nome do titular obrigatório',
}

interface PaymentFormProps {
  plans: Array<{ id: string; name: string; price_monthly: number; price_yearly?: number | null }>
  selectedPlanId: string
  onSuccess: () => void
  payerEmail: string
}

export function PaymentForm({ plans, selectedPlanId, onSuccess, payerEmail }: PaymentFormProps) {
  const { toast } = useToast()

  // Task 4.6: Billing cycle toggle state
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')

  // Task 4.2: Loading state during submission
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Task 4.5: SDK loading and error states
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkError, setSdkError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Task 4.3: Validation errors state
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Task 4.4: API error state
  const [apiError, setApiError] = useState<string | null>(null)

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  // Task 4.6: Calculate amount based on billing cycle
  const amount =
    billingCycle === 'yearly' && selectedPlan?.price_yearly
      ? selectedPlan.price_yearly
      : (selectedPlan?.price_monthly ?? 0)

  // Task 4.6: Calculate yearly discount percentage
  const yearlyDiscount =
    selectedPlan?.price_yearly && selectedPlan.price_monthly
      ? Math.round(
          ((selectedPlan.price_monthly * 12 - selectedPlan.price_yearly) /
            (selectedPlan.price_monthly * 12)) *
            100
        )
      : 0

  // Task 4.5: Handle SDK ready state
  const handleReady = useCallback(() => {
    setSdkReady(true)
    setSdkError(false)
  }, [])

  // Task 4.5: Retry loading SDK
  const handleRetry = useCallback(() => {
    setSdkError(false)
    setSdkReady(false)
    setRetryKey((k) => k + 1)
  }, [])

  // Task 4.3: Handle card validation errors
  const handleError = useCallback(
    (error: any) => {
      const errors = Array.isArray(error) ? error : [error]
      const messages = errors
        .map((e: any) => {
          if (e.field && CARD_VALIDATION_ERRORS[e.field]) {
            return CARD_VALIDATION_ERRORS[e.field]
          }
          return e.message || 'Erro de validação'
        })
        .filter(Boolean)

      setValidationErrors(messages)
    },
    []
  )

  // Task 4.2: Handle form submission
  const handleSubmit = useCallback(
    async (formData: any) => {
      setIsSubmitting(true)
      setValidationErrors([])
      setApiError(null)

      try {
        const response = await fetch('/api/billing/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: formData.token,
            plan_id: selectedPlanId,
            billing_cycle: billingCycle,
            payer: {
              email: payerEmail,
              identification: formData.payer?.identification ?? { type: 'CPF', number: '' },
            },
          }),
        })

        // Task 4.4: Handle API rejection responses
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          const errorMessage =
            data?.error || 'Pagamento recusado. Tente outro cartão.'

          setApiError(errorMessage)
          toast({
            variant: 'destructive',
            title: 'Erro no pagamento',
            description: errorMessage,
          })
          return
        }

        // Task 4.2: On success, call onSuccess callback
        toast({ title: 'Assinatura ativada com sucesso!' })
        onSuccess()
      } catch {
        const message = 'Erro de conexão. Verifique sua internet e tente novamente.'
        setApiError(message)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: message,
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [selectedPlanId, billingCycle, payerEmail, onSuccess, toast]
  )

  // Task 4.5: Detect SDK load failure via timeout
  useEffect(() => {
    if (sdkReady) return
    const timer = setTimeout(() => {
      setSdkError(true)
    }, 15000)
    return () => clearTimeout(timer)
  }, [sdkReady, retryKey])

  return (
    <div className="space-y-6">
      {/* Task 4.6: Billing cycle toggle */}
      {selectedPlan?.price_yearly && (
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center rounded-full border bg-muted p-1">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Anual
            </button>
          </div>

          {/* Task 4.6: Show yearly price with discount */}
          {billingCycle === 'yearly' && yearlyDiscount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-green-600">
                {yearlyDiscount}% de desconto
              </span>
              <span className="text-muted-foreground">
                R$ {selectedPlan.price_yearly!.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano
              </span>
            </div>
          )}

          {billingCycle === 'monthly' && (
            <p className="text-sm text-muted-foreground">
              R$ {selectedPlan.price_monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
            </p>
          )}
        </div>
      )}

      {/* Task 4.5: SDK error state with retry button */}
      {sdkError && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-red-700">
            Erro ao carregar formulário de pagamento. Tente novamente.
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Task 4.5: Loading skeleton while SDK initializes */}
      {!sdkReady && !sdkError && (
        <div className="space-y-4 rounded-2xl border bg-white p-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {/* Task 4.2: Loading overlay during submission */}
      {isSubmitting && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white p-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Processando pagamento...</span>
        </div>
      )}

      {/* Task 4.1: CardPayment component with locale pt-BR */}
      {!sdkError && (
        <div className={`rounded-2xl border bg-white p-6 ${!sdkReady || isSubmitting ? 'hidden' : ''}`}>
          <CardPayment
            key={retryKey}
            initialization={{ amount }}
            onSubmit={handleSubmit}
            onReady={handleReady}
            onError={handleError}
            locale="pt-BR"
          />
        </div>
      )}

      {/* Task 4.3: Card validation errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Task 4.4: API rejection error display */}
      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        </div>
      )}
    </div>
  )
}
