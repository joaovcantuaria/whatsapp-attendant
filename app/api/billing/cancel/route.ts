import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { preApproval } from '@/lib/mercadopago'
import type { CancelResponse } from '@/types/billing'

export async function POST(req: NextRequest) {
  try {
    // Validate session
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Get agent and verify admin/owner role
    const serviceClient = createServiceRoleClient()
    const { data: agent } = await serviceClient
      .from('agents')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single()

    if (!agent || !['admin', 'owner'].includes(agent.role)) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 })
    }

    // Get current active subscription
    const { data: subscription } = await serviceClient
      .from('subscriptions')
      .select('*')
      .eq('company_id', agent.company_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada' }, { status: 404 })
    }

    // Cancel in Mercado Pago
    await preApproval.update({
      id: subscription.mp_subscription_id,
      body: {
        status: 'cancelled',
      },
    })

    // Calculate effective date (end of current period)
    const cancellationEffectiveDate = subscription.current_period_end || new Date().toISOString()

    // Update subscription status
    await serviceClient
      .from('subscriptions')
      .update({
        status: 'pending_cancellation',
        cancellation_effective_date: cancellationEffectiveDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    const response: CancelResponse = {
      status: 'pending_cancellation',
      effective_date: cancellationEffectiveDate,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[cancel] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao cancelar assinatura. Tente novamente.' },
      { status: 500 }
    )
  }
}
