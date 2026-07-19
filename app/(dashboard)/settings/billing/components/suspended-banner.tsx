'use client'

import { AlertCircle } from 'lucide-react'

interface SuspendedBannerProps {
  onActivate: () => void
}

export function SuspendedBanner({ onActivate }: SuspendedBannerProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-red-100 p-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-red-900">
            Sua conta está suspensa
          </h3>
          <p className="text-sm text-red-700 mt-1">
            Ative um plano para restaurar o acesso. Seus dados estão seguros e serão mantidos.
          </p>
        </div>
      </div>
    </div>
  )
}
