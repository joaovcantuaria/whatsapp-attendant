import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { checkAgentLimit } from '@/lib/plan-limits'

// POST - Enviar convite
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { email, role = 'agent' } = body

    if (!email) {
      return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })
    }

    // Buscar company_id do membro
    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Você não pertence a uma empresa' }, { status: 400 })
    }

    // Verificar se é owner ou admin
    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Apenas owners e admins podem convidar' }, { status: 403 })
    }

    // Verificar limite de agentes
    const canAdd = await checkAgentLimit(member.company_id)
    if (!canAdd) {
      return NextResponse.json({ error: 'Limite de agentes do plano atingido. Faça upgrade.' }, { status: 403 })
    }

    // Verificar se já é membro
    const { data: existingMember } = await serviceClient
      .from('company_members')
      .select('id')
      .eq('company_id', member.company_id)
      .eq('user_id', email) // não funciona assim, precisa buscar por email no auth
      .single()

    // Verificar se já existe convite pendente
    const { data: existingInvite } = await serviceClient
      .from('invitations')
      .select('id')
      .eq('company_id', member.company_id)
      .eq('email', email)
      .is('accepted_at', null)
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'Já existe um convite pendente para este email' }, { status: 400 })
    }

    // Gerar token
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

    // Criar convite
    const { data: invitation, error } = await serviceClient
      .from('invitations')
      .insert({
        company_id: member.company_id,
        email,
        role,
        token,
        invited_by: session.user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enviar email de convite via Supabase Auth (magic link) ou Resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${appUrl}/invite/${token}`

    // Tentar enviar convite via Supabase Auth
    try {
      await serviceClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteUrl,
      })
    } catch (e) {
      // Se falhar, o convite ainda está salvo e pode ser aceito manualmente
      console.error('Email invite failed:', e)
    }

    return NextResponse.json({ invitation, inviteUrl })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// GET - Listar convites da empresa
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(invitations)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
