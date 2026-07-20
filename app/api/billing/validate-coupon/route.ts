import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    // --- Session validation ---
    const supabase = createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { valid: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // --- Parse body ---
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { valid: false, error: 'Cupom inválido ou expirado' }
      )
    }

    // --- Lookup coupon (case-insensitive) ---
    const serviceClient = createServiceRoleClient()

    const { data: coupon, error } = await serviceClient
      .from('coupons')
      .select('*')
      .ilike('code', code.trim())
      .single()

    if (error || !coupon) {
      return NextResponse.json(
        { valid: false, error: 'Cupom inválido ou expirado' }
      )
    }

    // --- Validate coupon ---
    if (!coupon.is_active) {
      return NextResponse.json(
        { valid: false, error: 'Cupom inválido ou expirado' }
      )
    }

    if (coupon.used_count >= coupon.max_uses) {
      return NextResponse.json(
        { valid: false, error: 'Cupom inválido ou expirado' }
      )
    }

    if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Cupom inválido ou expirado' }
      )
    }

    // --- Return valid coupon ---
    return NextResponse.json({
      valid: true,
      discount: coupon.discount,
      type: coupon.type,
      code: coupon.code,
    })
  } catch (error) {
    console.error('[validate-coupon] Error:', error)
    return NextResponse.json(
      { valid: false, error: 'Cupom inválido ou expirado' }
    )
  }
}
