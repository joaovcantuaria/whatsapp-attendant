import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { parseCSV } from '@/lib/utils'

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

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const search = request.nextUrl.searchParams.get('search')
    const companyId = await getUserCompanyId(session.user.id)

    let query = supabase
      .from('contacts')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true })

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()
    
    // Buscar company_id usando service client (bypassa RLS)
    const { data: memberData, error: memberError } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (memberError || !memberData?.company_id) {
      return NextResponse.json({ 
        error: 'Empresa não encontrada', 
        details: `user_id: ${session.user.id}, error: ${memberError?.message || 'no member found'}` 
      }, { status: 400 })
    }

    const companyId = memberData.company_id
    const body = await request.json()

    // Importação CSV em lote
    if (body.csvContent) {
      const rows = parseCSV(body.csvContent)
      const contacts = rows.map((row) => ({
        phone: row.phone || row.telefone,
        name: row.name || row.nome || null,
        email: row.email || null,
        company_id: companyId,
      })).filter((c) => c.phone)

      const { data, error } = await serviceClient
        .from('contacts')
        .upsert(contacts, { onConflict: 'phone' })
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Atribuir categoria à importação se fornecida
      if (body.category_id && data && data.length > 0) {
        const assignments = data.map((contact: { id: string }) => ({
          contact_id: contact.id,
          category_id: body.category_id,
        }))
        // Usar upsert para evitar duplicatas
        await serviceClient
          .from('contact_category_assignments')
          .upsert(assignments, { onConflict: 'contact_id,category_id' })
      }

      return NextResponse.json({ imported: data?.length || 0 })
    }

    // Criação individual
    const { data, error } = await serviceClient
      .from('contacts')
      .insert({ ...body, company_id: companyId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Atribuir categorias se fornecidas
    if (body.category_ids && body.category_ids.length > 0 && data) {
      const assignments = body.category_ids.map((catId: string) => ({
        contact_id: data.id,
        category_id: catId,
      }))
      await serviceClient.from('contact_category_assignments').insert(assignments)
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
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('contacts')
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
