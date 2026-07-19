import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { preApproval } from '@/lib/mercadopago'
import type { ReactivateResponse } from '@/types/billing'

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

    // Get subscription with pending_cancellation status
    const { data: subscription } = await serviceClient
      .from('subscriptions')
      .select('*')
      .eq('company_id', agent.company_id)
      .eq('status', 'pending_cancellation')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!subscription) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura pendente de cancelamento encontrada' },
        { status: 404 }
      )
    }

    // Reactivate in Mercado Pago
    await preApproval.update({
      id: subscription.mp_subscription_id,
      body: {
        status: 'authorized',
      },
    })

    // Update subscription status back to active
    await serviceClient
      .from('subscriptions')
      .update({
        status: 'active',
        cancellation_effective_date: null,
        scheduled_plan_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    // Ensure company plan_status is active
    await serviceClient
      .from('companies')
      .update({ plan_status: 'active' })
      .eq('id', agent.company_id)

    const response: ReactivateResponse = {
      status: 'active',
      current_period_end: subscription.current_period_end || new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[reactivate] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao reativar assinatura. Tente novamente.' },
      { status: 500 }
    )
  }
}
