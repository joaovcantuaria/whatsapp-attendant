'use client'

import { AlertCircle } from 'lucide-react'

interface Plan {
  name: string
  max_agents: number
  max_conversations_per_month: number
  max_contacts: number
}

interface DowngradeWarningProps {
  currentUsage: {
    agents: number
    messages: number
    contacts: number
  }
  newPlan: Plan
}

export function DowngradeWarning({ currentUsage, newPlan }: DowngradeWarningProps) {
  const warnings: string[] = []

  if (currentUsage.agents > newPlan.max_agents) {
    warnings.push(
      `Você possui ${currentUsage.agents} agentes ativos, mas o plano ${newPlan.name} permite apenas ${newPlan.max_agents}.`
    )
  }

  if (currentUsage.messages > newPlan.max_conversations_per_month) {
    warnings.push(
      `Seu uso atual é de ${currentUsage.messages.toLocaleString('pt-BR')} conversas/mês, mas o plano ${newPlan.name} permite apenas ${newPlan.max_conversations_per_month.toLocaleString('pt-BR')}.`
    )
  }

  if (currentUsage.contacts > newPlan.max_contacts) {
    warnings.push(
      `Você possui ${currentUsage.contacts.toLocaleString('pt-BR')} contatos, mas o plano ${newPlan.name} permite apenas ${newPlan.max_contacts.toLocaleString('pt-BR')}.`
    )
  }

  if (warnings.length === 0) return null

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
      <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Atenção: limites excedidos</span>
      </div>
      <ul className="space-y-1 text-sm text-red-600 ml-6 list-disc">
        {warnings.map((warning, i) => (
          <li key={i}>{warning}</li>
        ))}
      </ul>
      <p className="text-xs text-red-500 ml-6">
        Você precisará ajustar seu uso antes que o downgrade entre em vigor.
      </p>
    </div>
  )
}
