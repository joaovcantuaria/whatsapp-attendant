import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

// POST - Registrar push subscription do usuário
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { subscription } = body

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Buscar company
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

    // Salvar ou atualizar subscription
    await serviceClient
      .from('push_subscriptions')
      .upsert({
        user_id: session.user.id,
        company_id: member.company_id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,endpoint' })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Remover subscription
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { endpoint } = body

    const serviceClient = createServiceRoleClient()
    await serviceClient
      .from('push_subscriptions')
      .delete()
      .eq('user_id', session.user.id)
      .eq('endpoint', endpoint)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
