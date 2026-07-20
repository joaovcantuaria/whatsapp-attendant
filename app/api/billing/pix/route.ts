import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { payment } from '@/lib/mercadopago'

const pixSchema = z.object({
  plan_id: z.string().uuid(),
  billing_cycle: z.enum(['monthly', 'yearly']),
  payer: z.object({
    email: z.string().email(),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    identification: z.object({
      type: z.string().default('CPF'),
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
    const parsed = pixSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { plan_id, billing_cycle, payer } = parsed.data

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

    // --- Determine pricing ---
    const transactionAmount =
      billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly

    // --- Create PIX payment in Mercado Pago ---
    let mpPayment: any
    try {
      mpPayment = await payment.create({
        body: {
          transaction_amount: transactionAmount,
          description: plan.name,
          payment_method_id: 'pix',
          payer: {
            email: payer.email,
            first_name: payer.first_name,
            last_name: payer.last_name,
            identification: {
              type: payer.identification.type,
              number: payer.identification.number,
            },
          },
        },
      })
    } catch (mpError: any) {
      console.error('[pix] Mercado Pago error:', mpError)
      return NextResponse.json(
        { error: 'Erro ao gerar pagamento PIX. Tente novamente.' },
        { status: 422 }
      )
    }

    // --- Extract PIX data ---
    const transactionData = mpPayment.point_of_interaction?.transaction_data
    const qrCode = transactionData?.qr_code || ''
    const qrCodeBase64 = transactionData?.qr_code_base64 || ''
    const ticketUrl = transactionData?.ticket_url || ''
    const paymentId = mpPayment.id?.toString()
    const expiresAt = mpPayment.date_of_expiration || new Date(Date.now() + 30 * 60 * 1000).toISOString()

    // --- Create pending invoice ---
    // First check if there's an existing subscription for this company
    const { data: existingSub } = await serviceClient
      .from('subscriptions')
      .select('id')
      .eq('company_id', company_id)
      .in('status', ['active', 'pending_cancellation'])
      .single()

    // Create a temporary subscription record for PIX if none exists
    let subscriptionId = existingSub?.id
    if (!subscriptionId) {
      const { data: newSub } = await serviceClient
        .from('subscriptions')
        .insert({
          company_id,
          plan_id,
          mp_subscription_id: `pix_${paymentId}`,
          status: 'pending_cancellation', // Will be set to active on payment approval
          billing_cycle,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date().toISOString(),
        })
        .select('id')
        .single()
      subscriptionId = newSub?.id
    }

    if (subscriptionId) {
      await serviceClient.from('invoices').insert({
        subscription_id: subscriptionId,
        company_id,
        mp_payment_id: paymentId,
        amount: transactionAmount,
        currency: 'BRL',
        status: 'pending',
        failure_reason: null,
      })
    }

    return NextResponse.json(
      {
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        ticket_url: ticketUrl,
        payment_id: paymentId,
        expires_at: expiresAt,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[pix] Endpoint error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
