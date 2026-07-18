import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: plans, error } = await serviceClient
      .from('plans')
      .select('*')
      .order('price_monthly', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Contar assinantes de cada plano
    const enriched = await Promise.all(
      (plans || []).map(async (plan) => {
        const { count } = await serviceClient
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', plan.id)

        return { ...plan, subscribers: count || 0 }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()
    const body = await request.json()

    const { data, error } = await serviceClient
      .from('plans')
      .insert({
        name: body.name,
        slug: body.name.toLowerCase().replace(/\s+/g, '-'),
        price_monthly: body.price_monthly,
        price_yearly: body.price_yearly || null,
        max_agents: body.max_agents || 1,
        max_messages: body.max_messages || 1000,
        max_contacts: body.max_contacts || 500,
        features: body.features || [],
        is_active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()
    const body = await request.json()
    const { id, ...updates } = body

    const { data, error } = await serviceClient
      .from('plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    // Verificar se há empresas usando este plano
    const { count } = await serviceClient
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', id)

    if (count && count > 0) {
      return NextResponse.json({ error: 'Não é possível excluir um plano com assinantes ativos' }, { status: 400 })
    }

    const { error } = await serviceClient
      .from('plans')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
