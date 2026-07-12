import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

async function getUserCompanyId(userId: string) {
  const serviceClient = createServiceRoleClient()
  const { data } = await serviceClient
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  return data?.company_id || null
}

function generateApiKey(): string {
  return 'bgc_' + randomBytes(32).toString('hex')
}

// GET - Listar API keys da empresa
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 400 })

    const serviceClient = createServiceRoleClient()
    const { data } = await serviceClient
      .from('api_keys')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar nova API key
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 400 })

    const body = await request.json()
    const { name } = body

    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from('api_keys')
      .insert({
        company_id: companyId,
        name: name || 'API Key',
        key: generateApiKey(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Excluir API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 400 })

    const body = await request.json()
    const { id } = body

    const serviceClient = createServiceRoleClient()
    await serviceClient.from('api_keys').delete().eq('id', id).eq('company_id', companyId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
