import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase-server'

// POST - Criar empresa (onboarding)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const serviceClient = createServiceRoleClient()

    const body = await request.json()
    const { name, email, phone, document, userId } = body

    // Tentar pegar sessão, ou usar userId passado diretamente (do registro)
    let currentUserId = userId
    if (!currentUserId) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
      }
      currentUserId = session.user.id
    }

    if (!name || !email) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 })
    }

    // Gerar slug único
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) + '-' + Date.now().toString(36)

    // Buscar plano Starter como padrão
    const { data: starterPlan } = await serviceClient
      .from('plans')
      .select('id')
      .eq('slug', 'starter')
      .single()

    // Criar empresa
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const webhookUrl = `${appUrl}/api/webhook/${slug}`

    const { data: company, error } = await serviceClient
      .from('companies')
      .insert({
        name,
        slug,
        email,
        phone: phone || null,
        document: document || null,
        plan_id: starterPlan?.id || null,
        plan_status: 'trial',
        webhook_url: webhookUrl,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Adicionar usuário como owner
    await serviceClient.from('company_members').insert({
      company_id: company.id,
      user_id: currentUserId,
      role: 'owner',
      is_active: true,
      joined_at: new Date().toISOString(),
    })

    // Criar registro de agente se não existir
    const { data: existingAgent } = await serviceClient
      .from('agents')
      .select('id')
      .eq('id', currentUserId)
      .single()

    if (!existingAgent) {
      await serviceClient.from('agents').insert({
        id: currentUserId,
        name: body.userName || email.split('@')[0],
        email: email,
        role: 'admin',
      })
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error('Create company error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - Atualizar empresa
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('companies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
