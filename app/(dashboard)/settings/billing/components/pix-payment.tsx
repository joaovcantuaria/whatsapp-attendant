'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Copy, CheckCircle2, Clock, QrCode } from 'lucide-react'
import type { BillingCycle } from '@/types/billing'

interface PixPaymentProps {
  planId: string
  planName: string
  amount: number
  payerEmail: string
  billingCycle: BillingCycle
  onSuccess: () => void
  couponCode?: string
}

interface PixData {
  qr_code: string
  qr_code_base64: string
  ticket_url: string
  payment_id: string
  expires_at: string
}

export function PixPayment({
  planId,
  planName,
  amount,
  payerEmail,
  billingCycle,
  onSuccess,
  couponCode,
}: PixPaymentProps) {
  const { toast } = useToast()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [cpf, setCpf] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [paymentStatus, setPaymentStatus] = useState<string>('pending')

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Format CPF as user types
  const handleCpfChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    setCpf(digits)
  }

  // Format CPF for display
  const formatCpf = (value: string) => {
    if (value.length <= 3) return value
    if (value.length <= 6) return `${value.slice(0, 3)}.${value.slice(3)}`
    if (value.length <= 9) return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`
    return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`
  }

  // Submit PIX payment request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim() || cpf.length < 11) {
      toast({
        variant: 'destructive',
        title: 'Dados incompletos',
        description: 'Preencha todos os campos corretamente.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/billing/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          billing_cycle: billingCycle,
          coupon_code: couponCode || undefined,
          payer: {
            email: payerEmail,
            first_name: firstName,
            last_name: lastName,
            identification: { type: 'CPF', number: cpf },
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast({
          variant: 'destructive',
          title: 'Erro ao gerar PIX',
          description: data?.error || 'Tente novamente.',
        })
        return
      }

      const data: PixData = await res.json()
      setPixData(data)

      // Start countdown (30 minutes)
      const expiresAt = new Date(data.expires_at).getTime()
      const now = Date.now()
      setTimeLeft(Math.max(0, Math.floor((expiresAt - now) / 1000)))
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro de conexão. Verifique sua internet e tente novamente.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Countdown timer
  useEffect(() => {
    if (!pixData || timeLeft <= 0) return

    countdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [pixData, timeLeft > 0])

  // Poll payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!pixData?.payment_id) return

    try {
      const res = await fetch(`/api/billing/pix/status?payment_id=${pixData.payment_id}`)
      if (res.ok) {
        const data = await res.json()
        setPaymentStatus(data.status)

        if (data.status === 'approved') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          toast({ title: 'Pagamento confirmado!' })
          onSuccess()
        }
      }
    } catch {
      // Silently retry
    }
  }, [pixData?.payment_id, onSuccess, toast])

  useEffect(() => {
    if (!pixData?.payment_id) return

    pollingRef.current = setInterval(checkPaymentStatus, 5000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [pixData?.payment_id, checkPaymentStatus])

  // Copy PIX code
  const handleCopy = async () => {
    if (!pixData?.qr_code) return
    try {
      await navigator.clipboard.writeText(pixData.qr_code)
      setCopied(true)
      toast({ title: 'Código PIX copiado!' })
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao copiar' })
    }
  }

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Show QR code and payment info after submission
  if (pixData) {
    return (
      <div className="rounded-2xl border bg-white p-6 space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Pagamento PIX</h3>
          <p className="text-sm text-muted-foreground">
            Escaneie o QR Code ou copie o código para pagar
          </p>
        </div>

        {/* QR Code */}
        {pixData.qr_code_base64 && (
          <div className="flex justify-center">
            <div className="rounded-xl border p-4 bg-white">
              <img
                src={
                  pixData.qr_code_base64.startsWith('data:')
                    ? pixData.qr_code_base64
                    : `data:image/png;base64,${pixData.qr_code_base64}`
                }
                alt="QR Code PIX"
                className="w-56 h-56"
              />
            </div>
          </div>
        )}

        {/* PIX copia-e-cola */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Código PIX (copia e cola)</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={pixData.qr_code}
              className="text-xs font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="ml-1">{copied ? 'Copiado' : 'Copiar'}</span>
            </Button>
          </div>
        </div>

        {/* Countdown timer */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {timeLeft > 0 ? (
            <span className="text-muted-foreground">
              Expira em <span className="font-medium text-foreground">{formatTime(timeLeft)}</span>
            </span>
          ) : (
            <span className="text-red-500 font-medium">PIX expirado</span>
          )}
        </div>

        {/* Payment amount */}
        <div className="text-center text-sm text-muted-foreground">
          Valor: <span className="font-semibold text-foreground">R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          {' · '}{planName}
        </div>

        {/* Status / Check button */}
        <div className="flex flex-col items-center gap-3">
          {paymentStatus === 'approved' ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Pagamento confirmado!</span>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={checkPaymentStatus}
                className="w-full"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Verificar Pagamento
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                O status é verificado automaticamente a cada 5 segundos
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  // Form to collect payer data
  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold">Pagar com PIX</h3>
          <p className="text-sm text-muted-foreground">
            R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · {planName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pix-first-name">Nome</Label>
              <Input
                id="pix-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="João"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pix-last-name">Sobrenome</Label>
              <Input
                id="pix-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Silva"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pix-cpf">CPF</Label>
            <Input
              id="pix-cpf"
              value={formatCpf(cpf)}
              onChange={(e) => handleCpfChange(e.target.value)}
              placeholder="000.000.000-00"
              maxLength={14}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando PIX...
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-2" />
                Gerar QR Code PIX
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
