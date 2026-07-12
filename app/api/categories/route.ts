import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const DEFAULT_CATEGORIES = [
  { name: 'Lead Quente', color: '#EF4444', description: 'Leads com alta chance de conversão' },
  { name: 'Lead Frio', color: '#3B82F6', description: 'Leads que precisam ser nutridos' },
  { name: 'Cliente Ativo', color: '#22C55E', description: 'Clientes que já compraram' },
  { name: 'Cliente Inativo', color: '#6B7280', description: 'Clientes sem interação recente' },
  { name: 'VIP', color: '#A855F7', description: 'Clientes premium/recorrentes' },
  { name: 'São Paulo - SP', color: '#F59E0B', description: 'Contatos de São Paulo' },
  { name: 'Rio de Janeiro - RJ', color: '#F97316', description: 'Contatos do Rio de Janeiro' },
  { name: 'Minas Gerais - MG', color: '#10B981', description: 'Contatos de Minas Gerais' },
]

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

// GET - Listar categorias
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Verificar se já existem categorias, senão criar defaults
    const { data: existing } = await serviceClient
      .from('contact_categories')
      .select('id')
      .eq('company_id', companyId)
      .limit(1)

    if (!existing || existing.length === 0) {
      // Criar categorias default
      const defaults = DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        company_id: companyId,
        is_default: true,
      }))
      await serviceClient.from('contact_categories').insert(defaults)
    }

    // Buscar todas
    const { data, error } = await serviceClient
      .from('contact_categories')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar categoria
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    const body = await request.json()
    const { name, color, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from('contact_categories')
      .insert({
        company_id: companyId,
        name,
        color: color || '#6B7280',
        description: description || null,
      })
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

// DELETE - Excluir categoria
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient
      .from('contact_categories')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
