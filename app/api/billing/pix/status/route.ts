import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { payment } from '@/lib/mercadopago'

export async function GET(request: Request) {
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

    // --- Get payment_id from query params ---
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('payment_id')

    if (!paymentId) {
      return NextResponse.json(
        { error: 'payment_id é obrigatório' },
        { status: 400 }
      )
    }

    // --- Fetch payment status from Mercado Pago ---
    let paymentDetails: any
    try {
      paymentDetails = await payment.get({ id: paymentId })
    } catch (err: any) {
      console.error('[pix/status] Failed to fetch payment:', err)
      return NextResponse.json(
        { error: 'Erro ao consultar status do pagamento.' },
        { status: 500 }
      )
    }

    const status = paymentDetails.status as string

    // --- If approved, activate subscription ---
    if (status === 'approved') {
      const serviceClient = createServiceRoleClient()
      const mpPaymentId = paymentDetails.id?.toString()

      // Find the invoice by mp_payment_id
      const { data: invoice } = await serviceClient
        .from('invoices')
        .select('id, subscription_id, company_id, status')
        .eq('mp_payment_id', mpPaymentId)
        .single()

      if (invoice && invoice.status !== 'approved') {
        // Update invoice to approved
        await serviceClient
          .from('invoices')
          .update({
            status: 'approved',
            paid_at: paymentDetails.date_approved || new Date().toISOString(),
          })
          .eq('id', invoice.id)

        // Get subscription details to find plan_id
        const { data: subscription } = await serviceClient
          .from('subscriptions')
          .select('id, company_id, plan_id, billing_cycle, mp_subscription_id')
          .eq('id', invoice.subscription_id)
          .single()

        if (subscription) {
          // Calculate period dates
          const now = new Date()
          const periodEnd = new Date(now)
          if (subscription.billing_cycle === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1)
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1)
          }

          // Activate the subscription
          await serviceClient
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              consecutive_failures: 0,
              updated_at: now.toISOString(),
            })
            .eq('id', subscription.id)

          // Update company plan_id and plan_status
          await serviceClient
            .from('companies')
            .update({ plan_id: subscription.plan_id, plan_status: 'active' })
            .eq('id', subscription.company_id)
        }
      }
    }

    return NextResponse.json({ status })
  } catch (error: any) {
    console.error('[pix/status] Endpoint error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
