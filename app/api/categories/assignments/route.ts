import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

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

// GET - Listar todas as associações contato-categoria da empresa
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

    // Buscar assignments para contatos da empresa
    const { data, error } = await serviceClient
      .from('contact_category_assignments')
      .select(`
        id,
        contact_id,
        category_id,
        contacts!inner(company_id)
      `)
      .eq('contacts.company_id', companyId)

    if (error) {
      // Fallback: buscar sem join se a tabela não suportar
      const { data: contacts } = await serviceClient
        .from('contacts')
        .select('id')
        .eq('company_id', companyId)

      if (contacts && contacts.length > 0) {
        const contactIds = contacts.map(c => c.id)
        const { data: assignments } = await serviceClient
          .from('contact_category_assignments')
          .select('id, contact_id, category_id')
          .in('contact_id', contactIds)

        return NextResponse.json(assignments || [])
      }

      return NextResponse.json([])
    }

    // Remove o campo contacts do resultado
    const cleaned = (data || []).map(({ id, contact_id, category_id }) => ({
      id,
      contact_id,
      category_id,
    }))

    return NextResponse.json(cleaned)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
