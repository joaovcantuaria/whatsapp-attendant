'use client'

import { Button } from '@/components/ui/button'
import { Clock, Zap } from 'lucide-react'

interface TrialBannerProps {
  trialEndDate: string
  onActivate: () => void
}

export function TrialBanner({ trialEndDate, onActivate }: TrialBannerProps) {
  const endDate = new Date(trialEndDate)
  const now = new Date()
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  return (
    <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-orange-100 p-2">
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-orange-900">
              {daysLeft > 0
                ? `Seu trial expira em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`
                : 'Seu trial expirou'
              }
            </h3>
            <p className="text-sm text-orange-700 mt-1">
              Ative um plano para continuar usando todos os recursos.
            </p>
          </div>
        </div>
        <Button onClick={onActivate} className="bg-orange-600 hover:bg-orange-700 shrink-0">
          <Zap className="h-4 w-4 mr-2" />
          Ativar Plano
        </Button>
      </div>
    </div>
  )
}
