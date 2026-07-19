import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { preApproval } from '@/lib/mercadopago'
import type { ChangePlanRequest, ChangePlanResponse } from '@/types/billing'

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

    const body: ChangePlanRequest = await req.json()
    const { new_plan_id, billing_cycle } = body

    if (!new_plan_id) {
      return NextResponse.json({ error: 'plan_id é obrigatório' }, { status: 400 })
    }

    // Get current subscription
    const { data: subscription } = await serviceClient
      .from('subscriptions')
      .select('*')
      .eq('company_id', agent.company_id)
      .in('status', ['active', 'pending_cancellation'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada' }, { status: 404 })
    }

    // Get current plan
    const { data: currentPlan } = await serviceClient
      .from('plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .single()

    // Get new plan
    const { data: newPlan } = await serviceClient
      .from('plans')
      .select('*')
      .eq('id', new_plan_id)
      .eq('is_active', true)
      .single()

    if (!newPlan) {
      return NextResponse.json({ error: 'Plano não encontrado ou inativo' }, { status: 404 })
    }

    if (!currentPlan) {
      return NextResponse.json({ error: 'Plano atual não encontrado' }, { status: 404 })
    }

    const currentPrice = billing_cycle === 'yearly' && currentPlan.price_yearly
      ? currentPlan.price_yearly
      : currentPlan.price_monthly

    const newPrice = billing_cycle === 'yearly' && newPlan.price_yearly
      ? newPlan.price_yearly
      : newPlan.price_monthly

    const isUpgrade = newPrice > currentPrice

    if (isUpgrade) {
      // Task 5.3: Upgrade logic - immediate effect
      const now = new Date()
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const totalDays = billing_cycle === 'yearly' ? 365 : 30
      const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      const proratedAmount = parseFloat(((newPrice - currentPrice) * (daysRemaining / totalDays)).toFixed(2))

      // Update subscription amount in Mercado Pago
      await preApproval.update({
        id: subscription.mp_subscription_id,
        body: {
          auto_recurring: {
            transaction_amount: newPrice,
            currency_id: 'BRL',
          },
        },
      })

      // Update subscription in database
      await serviceClient
        .from('subscriptions')
        .update({
          plan_id: new_plan_id,
          billing_cycle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id)

      // Update company plan_id immediately
      await serviceClient
        .from('companies')
        .update({ plan_id: new_plan_id })
        .eq('id', agent.company_id)

      // Create invoice for prorated amount
      if (proratedAmount > 0) {
        await serviceClient.from('invoices').insert({
          subscription_id: subscription.id,
          company_id: agent.company_id,
          amount: proratedAmount,
          currency: 'BRL',
          status: 'pending',
          billing_period_start: now.toISOString(),
          billing_period_end: periodEnd.toISOString(),
          card_last_four: subscription.card_last_four,
        })
      }

      const response: ChangePlanResponse = {
        type: 'upgrade',
        effective_date: now.toISOString(),
        prorated_amount: proratedAmount,
        new_plan: {
          name: newPlan.name,
          price_monthly: newPlan.price_monthly,
        },
      }

      return NextResponse.json(response)
    } else {
      // Task 5.4: Downgrade logic - scheduled for end of period
      const effectiveDate = subscription.current_period_end || new Date().toISOString()

      await serviceClient
        .from('subscriptions')
        .update({
          scheduled_plan_id: new_plan_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id)

      const response: ChangePlanResponse = {
        type: 'downgrade',
        effective_date: effectiveDate,
        prorated_amount: null,
        new_plan: {
          name: newPlan.name,
          price_monthly: newPlan.price_monthly,
        },
      }

      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('[change-plan] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao alterar plano. Tente novamente.' },
      { status: 500 }
    )
  }
}
