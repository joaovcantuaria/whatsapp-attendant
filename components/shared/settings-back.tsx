'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function SettingsBack() {
  return (
    <Link
      href="/settings"
      className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 transition-colors mb-4"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Voltar para Configurações
    </Link>
  )
}
