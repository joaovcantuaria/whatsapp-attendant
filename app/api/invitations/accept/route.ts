import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

// POST - Aceitar convite
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const serviceClient = createServiceRoleClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Faça login primeiro' }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
    }

    // Buscar convite
    const { data: invitation } = await serviceClient
      .from('invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .single()

    if (!invitation) {
      return NextResponse.json({ error: 'Convite inválido ou já aceito' }, { status: 400 })
    }

    // Verificar expiração
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Convite expirado' }, { status: 400 })
    }

    // Adicionar como membro
    const { error: memberError } = await serviceClient
      .from('company_members')
      .insert({
        company_id: invitation.company_id,
        user_id: session.user.id,
        role: invitation.role,
        invited_by: invitation.invited_by,
        joined_at: new Date().toISOString(),
      })

    if (memberError) {
      if (memberError.code === '23505') {
        return NextResponse.json({ error: 'Você já é membro desta empresa' }, { status: 400 })
      }
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    // Criar registro de agente
    await serviceClient.from('agents').upsert({
      id: session.user.id,
      name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Agent',
      email: session.user.email!,
      role: invitation.role === 'owner' ? 'admin' : 'agent',
    })

    // Marcar convite como aceito
    await serviceClient
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return NextResponse.json({ success: true, companyId: invitation.company_id })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
