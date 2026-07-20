import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { preApproval } from '@/lib/mercadopago'
import { getMpErrorMessage } from '@/lib/mp-error-messages'
import type { SubscribeResponse } from '@/types/billing'

// Task 2.4: Zod validation schema
const subscribeSchema = z.object({
  plan_id: z.string().uuid(),
  billing_cycle: z.enum(['monthly', 'yearly']),
  token: z.string().min(1),
  coupon_code: z.string().optional(),
  payer: z.object({
    email: z.string().email(),
    identification: z.object({
      type: z.string(),
      number: z.string().min(11),
    }),
  }),
})

export async function POST(request: Request) {
  try {
    // --- Session validation ---
    const supabase = createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // --- Parse & validate body ---
    const body = await request.json()
    const parsed = subscribeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { plan_id, billing_cycle, token, payer, coupon_code } = parsed.data

    // --- Check admin/owner role ---
    const { data: membership, error: memberError } = await supabase
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', session.user.id)
      .in('role', ['admin', 'owner'])
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem gerenciar assinaturas.' },
        { status: 403 }
      )
    }

    const { company_id } = membership

    // --- Validate plan exists and is active ---
    const serviceClient = createServiceRoleClient()

    const { data: plan, error: planError } = await serviceClient
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plano não encontrado ou inativo.' },
        { status: 404 }
      )
    }

    // --- Determine pricing and frequency ---
    let transactionAmount =
      billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly
    const frequencyType = billing_cycle === 'yearly' ? 'months' : 'months'
    const frequency = billing_cycle === 'yearly' ? 12 : 1

    // --- Validate and apply coupon if provided ---
    let validatedCouponId: string | null = null
    if (coupon_code) {
      const { data: coupon } = await serviceClient
        .from('coupons')
        .select('*')
        .ilike('code', coupon_code)
        .single()

      if (
        coupon &&
        coupon.is_active &&
        coupon.used_count < coupon.max_uses &&
        (!coupon.expires_at || new Date(coupon.expires_at) > new Date())
      ) {
        validatedCouponId = coupon.id
        if (coupon.type === 'percent') {
          transactionAmount = transactionAmount * (1 - coupon.discount / 100)
        } else {
          transactionAmount = Math.max(0, transactionAmount - coupon.discount)
        }
        // Round to 2 decimal places
        transactionAmount = Math.round(transactionAmount * 100) / 100
      }
    }

    // --- Create preapproval (subscription) in Mercado Pago ---
    let mpSubscription: any
    try {
      mpSubscription = await preApproval.create({
        body: {
          reason: plan.name,
          payer_email: payer.email,
          card_token_id: token,
          auto_recurring: {
            frequency,
            frequency_type: frequencyType,
            transaction_amount: transactionAmount,
            currency_id: 'BRL',
          },
          back_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing`,
          status: 'authorized',
        },
      })
    } catch (mpError: any) {
      // Task 2.3: Handle MP API rejection errors
      const rejectionCode =
        mpError?.cause?.[0]?.code ||
        mpError?.message ||
        mpError?.status_detail
      const userMessage = getMpErrorMessage(rejectionCode)

      return NextResponse.json(
        { error: userMessage, code: rejectionCode },
        { status: 422 }
      )
    }

    // --- Calculate period dates ---
    const now = new Date()
    const periodEnd = new Date(now)
    if (billing_cycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    // --- Store subscription record in Supabase ---
    const { data: subscription, error: subError } = await serviceClient
      .from('subscriptions')
      .insert({
        company_id,
        plan_id,
        mp_subscription_id: mpSubscription.id,
        mp_payer_id: mpSubscription.payer_id?.toString() || null,
        status: 'active',
        billing_cycle,
        card_last_four: mpSubscription.card?.last_four_digits || null,
        card_brand: mpSubscription.card?.payment_method?.id || null,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .select('id')
      .single()

    if (subError || !subscription) {
      console.error('Failed to store subscription:', subError)
      return NextResponse.json(
        { error: 'Erro ao salvar assinatura. Tente novamente.' },
        { status: 500 }
      )
    }

    // --- Update company plan_id and plan_status ---
    const { error: companyError } = await serviceClient
      .from('companies')
      .update({ plan_id, plan_status: 'active' })
      .eq('id', company_id)

    if (companyError) {
      console.error('Failed to update company plan:', companyError)
    }

    // --- Increment coupon used_count ---
    if (validatedCouponId) {
      const { data: currentCoupon } = await serviceClient
        .from('coupons')
        .select('used_count')
        .eq('id', validatedCouponId)
        .single()
      if (currentCoupon) {
        await serviceClient
          .from('coupons')
          .update({ used_count: currentCoupon.used_count + 1 })
          .eq('id', validatedCouponId)
      }
    }

    // --- Return response ---
    const response: SubscribeResponse = {
      subscription_id: subscription.id,
      mp_subscription_id: mpSubscription.id,
      status: 'active',
      current_period_end: periodEnd.toISOString(),
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('Subscribe endpoint error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
