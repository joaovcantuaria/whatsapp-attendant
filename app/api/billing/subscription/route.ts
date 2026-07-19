import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    // Buscar company_id do agente autenticado
    const { data: agent } = await serviceClient
      .from('agents')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (!agent?.company_id) {
      return NextResponse.json({ subscription: null })
    }

    // Buscar assinatura ativa ou pendente de cancelamento
    const { data: subscription, error: subError } = await serviceClient
      .from('subscriptions')
      .select('*')
      .eq('company_id', agent.company_id)
      .in('status', ['active', 'pending_cancellation'])
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ subscription: null })
    }

    // Buscar informações do plano
    const { data: plan } = await serviceClient
      .from('plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .single()

    return NextResponse.json({
      subscription: {
        ...subscription,
        plan,
        next_billing_date: subscription.current_period_end,
      },
    })
  } catch (error) {
    console.error('Billing subscription GET error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
