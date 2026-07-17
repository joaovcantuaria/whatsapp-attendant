import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

    const { data: tags } = await serviceClient
      .from('tags')
      .select('*')
      .eq('company_id', member.company_id)
      .order('name')

    return NextResponse.json(tags || [])
  } catch {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { name, color } = body
    if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })

    const { data: tag, error } = await serviceClient
      .from('tags')
      .insert({ name, color: color || '#6B7280', company_id: member.company_id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(tag)
  } catch {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
