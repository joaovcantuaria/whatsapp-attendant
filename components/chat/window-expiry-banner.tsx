'use client'

import { WindowStatus } from '@/types'
import { AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WindowExpiryBannerProps {
  status: WindowStatus
}

export function WindowExpiryBanner({ status }: WindowExpiryBannerProps) {
  if (status === 'open') return null

  return (
    <div
      className={cn(
        'px-4 py-2 flex items-center gap-2 text-sm',
        status === 'expiring'
          ? 'bg-yellow-50 text-yellow-800 border-b border-yellow-200'
          : 'bg-red-50 text-red-800 border-b border-red-200'
      )}
    >
      {status === 'expiring' ? (
        <>
          <Clock className="h-4 w-4" />
          <span>A janela de 24h está expirando em breve. Após expirar, apenas templates poderão ser enviados.</span>
        </>
      ) : (
        <>
          <AlertTriangle className="h-4 w-4" />
          <span>A janela de 24h expirou. Somente templates aprovados podem ser enviados.</span>
        </>
      )}
    </div>
  )
}
