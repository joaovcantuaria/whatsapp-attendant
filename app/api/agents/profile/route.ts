import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    const { data, error } = await serviceClient
      .from('agents')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, greeting_message, color } = body

    const serviceClient = createServiceRoleClient()

    const updates: Record<string, any> = {}
    if (name) updates.name = name
    if (greeting_message !== undefined) updates.greeting_message = greeting_message
    if (color) updates.color = color

    const { data, error } = await serviceClient
      .from('agents')
      .update(updates)
      .eq('id', session.user.id)
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
