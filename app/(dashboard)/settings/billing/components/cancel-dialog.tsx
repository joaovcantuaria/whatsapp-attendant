'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle } from 'lucide-react'

interface CancelDialogProps {
  periodEndDate: string
  onConfirm: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CancelDialog({ periodEndDate, onConfirm, open, onOpenChange }: CancelDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (!open) return null

  const formattedDate = new Date(periodEndDate).toLocaleDateString('pt-BR')

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => !isLoading && onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl mx-4">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Cancelar Assinatura?</h2>
            <p className="text-sm text-muted-foreground">
              Seu acesso continua ativo até <strong>{formattedDate}</strong>.
              Após essa data, sua conta será desativada.
            </p>
          </div>

          <div className="flex gap-3 w-full pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Manter Assinatura
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Confirmar Cancelamento'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
