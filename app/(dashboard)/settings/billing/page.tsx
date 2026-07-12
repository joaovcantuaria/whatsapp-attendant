'use client'

import { useCompany } from '@/hooks/use-company'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreditCard, Clock, Zap } from 'lucide-react'
import { SettingsBack } from '@/components/shared/settings-back'

export default function BillingPage() {
  const { company, plan, trialDaysLeft, isPlanActive } = useCompany()

  const statusLabel: Record<string, string> = {
    trial: 'Trial',
    active: 'Ativo',
    suspended: 'Suspenso',
    cancelled: 'Cancelado',
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success' as const
      case 'trial': return 'warning' as const
      case 'suspended': return 'destructive' as const
      default: return 'secondary' as const
    }
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto max-w-3xl mx-auto">
      <SettingsBack />
      <h1 className="text-2xl font-bold">Faturamento</h1>

      {/* Plano Atual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Plano Atual</CardTitle>
            <Badge variant={statusVariant(company?.plan_status || 'trial')}>
              {statusLabel[company?.plan_status || 'trial']}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-bold text-xl">{plan?.name || 'Starter'}</p>
              <p className="text-sm text-muted-foreground">{plan?.description}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">R$ {plan?.price_monthly || '297'}</p>
              <p className="text-xs text-muted-foreground">/mês</p>
            </div>
          </div>

          {company?.plan_status === 'trial' && trialDaysLeft !== null && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              <Clock className="h-4 w-4" />
              <span>
                {trialDaysLeft > 0
                  ? `Seu trial expira em ${trialDaysLeft} dia${trialDaysLeft > 1 ? 's' : ''}`
                  : 'Seu trial expirou. Ative um plano para continuar.'
                }
              </span>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agentes incluídos</span>
              <span className="font-medium">{plan?.max_agents || 2}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conversas/mês</span>
              <span className="font-medium">{plan?.max_conversations_per_month?.toLocaleString() || '500'}</span>
            </div>
          </div>

          <Button className="w-full">
            <Zap className="h-4 w-4 mr-2" />
            Fazer Upgrade
          </Button>
        </CardContent>
      </Card>

      {/* Planos Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alterar Plano</CardTitle>
          <CardDescription>Escolha o plano ideal para sua equipe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {['Starter', 'Pro', 'Business'].map((planName) => (
              <div key={planName} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{planName}</p>
                  <p className="text-sm text-muted-foreground">
                    {planName === 'Starter' && '2 agentes • 500 conversas/mês'}
                    {planName === 'Pro' && '5 agentes • 2.000 conversas/mês'}
                    {planName === 'Business' && '15 agentes • 10.000 conversas/mês'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">
                    {planName === 'Starter' && 'R$ 297'}
                    {planName === 'Pro' && 'R$ 597'}
                    {planName === 'Business' && 'R$ 997'}
                  </p>
                  {plan?.name === planName ? (
                    <Badge variant="secondary">Atual</Badge>
                  ) : (
                    <Button size="sm" variant="outline">Selecionar</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
