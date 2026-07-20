import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { payment } from '@/lib/mercadopago'
import { createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// --- Task 3.1: Signature validation ---
function validateWebhookSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  secret: string
): boolean {
  const parts = xSignature.split(',')
  const ts = parts.find((p) => p.trim().startsWith('ts='))?.split('=')[1]
  const hash = parts.find((p) => p.trim().startsWith('v1='))?.split('=')[1]

  if (!ts || !hash) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const computed = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')

  return computed === hash
}

export async function POST(request: Request) {
  // Task 3.7: Return 200 immediately — process in try/catch, always return 200
  try {
    const body = await request.json()

    // --- Task 3.1: Validate signature ---
    const xSignature = request.headers.get('x-signature') || ''
    const xRequestId = request.headers.get('x-request-id') || ''
    const dataId = body?.data?.id?.toString() || ''
    const secret = process.env.MP_WEBHOOK_SECRET || ''

    if (!xSignature || !validateWebhookSignature(xSignature, xRequestId, dataId, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const topic = body?.type || body?.topic || ''
    const action = body?.action || ''

    const supabase = createServiceRoleClient()

    // --- Payment events ---
    if (topic === 'payment') {
      const paymentId = body?.data?.id?.toString()
      if (!paymentId) {
        return NextResponse.json({ received: true }, { status: 200 })
      }

      // Fetch payment details from MP API
      let paymentDetails: any
      try {
        paymentDetails = await payment.get({ id: paymentId })
      } catch (err) {
        console.error('[webhook] Failed to fetch payment details:', err)
        return NextResponse.json({ received: true }, { status: 200 })
      }

      const mpPaymentId = paymentDetails.id?.toString()
      const paymentStatus = paymentDetails.status as string
      const mpSubscriptionId = paymentDetails.metadata?.preapproval_id
        || paymentDetails.point_of_interaction?.subscription_id
        || paymentDetails.metadata?.subscription_id
        || ''

      // --- Task 3.6: Idempotency guard ---
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id, status')
        .eq('mp_payment_id', mpPaymentId)
        .single()

      if (existingInvoice && existingInvoice.status === paymentStatus) {
        // Already processed with same status — skip
        return NextResponse.json({ received: true }, { status: 200 })
      }

      // Find subscription by mp_subscription_id or payer context
      let subscription: any = null
      if (mpSubscriptionId) {
        const { data } = await supabase
          .from('subscriptions')
          .select('id, company_id, consecutive_failures')
          .eq('mp_subscription_id', mpSubscriptionId)
          .single()
        subscription = data
      }

      // Fallback: try to find by payer_id if subscription not found
      if (!subscription && paymentDetails.payer?.id) {
        const { data } = await supabase
          .from('subscriptions')
          .select('id, company_id, consecutive_failures')
          .eq('mp_payer_id', paymentDetails.payer.id.toString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        subscription = data
      }

      // Fallback: find subscription via invoice (for PIX payments)
      if (!subscription && mpPaymentId) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('subscription_id')
          .eq('mp_payment_id', mpPaymentId)
          .single()

        if (invoice?.subscription_id) {
          const { data } = await supabase
            .from('subscriptions')
            .select('id, company_id, consecutive_failures')
            .eq('id', invoice.subscription_id)
            .single()
          subscription = data
        }
      }

      if (!subscription) {
        console.error('[webhook] No subscription found for payment:', mpPaymentId)
        return NextResponse.json({ received: true }, { status: 200 })
      }

      // --- Task 3.2: payment.approved ---
      if (paymentStatus === 'approved') {
        const invoiceData = {
          subscription_id: subscription.id,
          company_id: subscription.company_id,
          mp_payment_id: mpPaymentId,
          amount: paymentDetails.transaction_amount || paymentDetails.net_amount || 0,
          currency: paymentDetails.currency_id || 'BRL',
          status: 'approved' as const,
          card_last_four: paymentDetails.card?.last_four_digits || null,
          paid_at: paymentDetails.date_approved || new Date().toISOString(),
          failure_reason: null,
        }

        if (existingInvoice) {
          await supabase
            .from('invoices')
            .update({ status: 'approved', paid_at: invoiceData.paid_at, failure_reason: null })
            .eq('id', existingInvoice.id)
        } else {
          await supabase.from('invoices').insert(invoiceData)
        }

        // Confirm company plan_status as active
        await supabase
          .from('companies')
          .update({ plan_status: 'active' })
          .eq('id', subscription.company_id)

        // Reset consecutive_failures to 0 and activate subscription if pending (PIX flow)
        const { data: currentSub } = await supabase
          .from('subscriptions')
          .select('status, billing_cycle, plan_id')
          .eq('id', subscription.id)
          .single()

        const subUpdate: Record<string, any> = {
          consecutive_failures: 0,
          updated_at: new Date().toISOString(),
        }

        // Activate PIX subscriptions that are still pending
        if (currentSub && currentSub.status !== 'active') {
          const now = new Date()
          const periodEnd = new Date(now)
          if (currentSub.billing_cycle === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1)
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1)
          }
          subUpdate.status = 'active'
          subUpdate.current_period_start = now.toISOString()
          subUpdate.current_period_end = periodEnd.toISOString()

          // Also update the company plan_id
          if (currentSub.plan_id) {
            await supabase
              .from('companies')
              .update({ plan_id: currentSub.plan_id, plan_status: 'active' })
              .eq('id', subscription.company_id)
          }
        }

        await supabase
          .from('subscriptions')
          .update(subUpdate)
          .eq('id', subscription.id)
      }

      // --- Task 3.3: payment.pending ---
      else if (paymentStatus === 'pending' || paymentStatus === 'in_process') {
        const invoiceData = {
          subscription_id: subscription.id,
          company_id: subscription.company_id,
          mp_payment_id: mpPaymentId,
          amount: paymentDetails.transaction_amount || 0,
          currency: paymentDetails.currency_id || 'BRL',
          status: 'pending' as const,
          card_last_four: paymentDetails.card?.last_four_digits || null,
          failure_reason: null,
        }

        if (existingInvoice) {
          await supabase
            .from('invoices')
            .update({ status: 'pending' })
            .eq('id', existingInvoice.id)
        } else {
          await supabase.from('invoices').insert(invoiceData)
        }
      }

      // --- Task 3.4: payment.rejected ---
      else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
        const failureReason =
          paymentDetails.status_detail || paymentDetails.detail || 'unknown'

        const invoiceData = {
          subscription_id: subscription.id,
          company_id: subscription.company_id,
          mp_payment_id: mpPaymentId,
          amount: paymentDetails.transaction_amount || 0,
          currency: paymentDetails.currency_id || 'BRL',
          status: 'rejected' as const,
          card_last_four: paymentDetails.card?.last_four_digits || null,
          failure_reason: failureReason,
        }

        if (existingInvoice) {
          await supabase
            .from('invoices')
            .update({ status: 'rejected', failure_reason: failureReason })
            .eq('id', existingInvoice.id)
        } else {
          await supabase.from('invoices').insert(invoiceData)
        }

        // Increment consecutive_failures
        const newFailures = (subscription.consecutive_failures || 0) + 1
        await supabase
          .from('subscriptions')
          .update({
            consecutive_failures: newFailures,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id)

        // If consecutive_failures >= 3, suspend company
        if (newFailures >= 3) {
          await supabase
            .from('companies')
            .update({ plan_status: 'suspended' })
            .eq('id', subscription.company_id)

          await supabase
            .from('subscriptions')
            .update({ status: 'suspended', updated_at: new Date().toISOString() })
            .eq('id', subscription.id)
        }
      }
    }

    // --- Task 3.5: Subscription cancellation ---
    else if (topic === 'subscription_preapproval') {
      const preapprovalId = body?.data?.id?.toString()
      if (!preapprovalId) {
        return NextResponse.json({ received: true }, { status: 200 })
      }

      // Check if this is a cancellation event
      const status = body?.data?.status || action
      if (status === 'cancelled') {
        // Update subscription status to cancelled
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('id, company_id')
          .eq('mp_subscription_id', preapprovalId)
          .single()

        if (subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', subscription.id)

          // Update company plan_status to cancelled
          await supabase
            .from('companies')
            .update({ plan_status: 'cancelled' })
            .eq('id', subscription.company_id)
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    // Task 3.7: Log errors for manual review, always return 200
    console.error('[webhook] Mercado Pago webhook processing error:', error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
