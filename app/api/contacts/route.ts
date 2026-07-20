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

    // Filtrar grupos (números com mais de 15 dígitos ou com hífen - formato de grupo WhatsApp)
    const contacts = (data || []).filter((contact: any) => {
      const phone = contact.phone || ''
      // Grupos têm formato como "120363422746351261" (>15 dígitos) ou contêm hífen
      if (phone.includes('-')) return false
      if (phone.replace(/\D/g, '').length > 15) return false
      return true
    })

    return NextResponse.json(contacts)
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
      const contacts = rows.map((row) => {
        // Detectar coluna de telefone - PRIORIZAR WhatsApp sobre telefone fixo
        const whatsappField = row.whatsapp || row.wpp || row.zap || ''
        const phoneField = row.phone || row.telefone || row.tel || row.celular || row.numero || row.número || row.fone || ''
        
        // Preferir o campo WhatsApp se existir e tiver número válido
        let rawPhone = ''
        const cleanWhatsapp = whatsappField.replace(/\D/g, '')
        const cleanPhoneField = phoneField.replace(/\D/g, '')
        
        if (cleanWhatsapp.length >= 10) {
          rawPhone = cleanWhatsapp
        } else if (cleanPhoneField.length >= 10) {
          rawPhone = cleanPhoneField
        }
        
        // Garantir formato: remover 0 inicial se tiver, adicionar 55 se não tiver
        let cleanPhone = rawPhone
        if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
          cleanPhone = cleanPhone.substring(1) // Remove 0 do DDD
        }
        // Se tem 10-11 dígitos sem código do país, adicionar 55
        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
          cleanPhone = '55' + cleanPhone
        }
        // Se começa com 55 e tem 12 dígitos (fixo), pode ser válido
        // Se começa com 55 e tem 13 dígitos (celular), perfeito
        
        // Detectar coluna de nome
        const name = row.name || row.nome || row.razao_social || row['razão social'] || row.empresa || row.cliente || ''
        // Detectar coluna de email
        const email = row.email || row['e-mail'] || row.mail || ''
        
        return {
          phone: cleanPhone,
          name: name || null,
          email: email || null,
          company_id: companyId,
        }
      }).filter((c) => c.phone && c.phone.length >= 12) // Mínimo 12 dígitos (55 + DDD + número)

      if (contacts.length === 0) {
        return NextResponse.json({ error: 'Nenhum contato válido encontrado. Verifique se o CSV tem uma coluna com nome "phone", "telefone", "celular" ou "whatsapp" com números de celular válidos.' }, { status: 400 })
      }

      const { data, error } = await serviceClient
        .from('contacts')
        .upsert(contacts, { onConflict: 'phone,company_id' })
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
    const { category_ids, ...contactData } = body

    // Verificar se já existe contato com esse telefone nesta empresa
    const { data: existingContact } = await serviceClient
      .from('contacts')
      .select('*')
      .eq('phone', contactData.phone)
      .eq('company_id', companyId)
      .maybeSingle()

    if (existingContact) {
      return NextResponse.json(existingContact) // Retorna o existente
    }

    const { data, error } = await serviceClient
      .from('contacts')
      .insert({ ...contactData, company_id: companyId })
      .select()
      .single()

    if (error) {
      // Se é duplicate key, tentar buscar o contato existente
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        const { data: existing } = await serviceClient
          .from('contacts')
          .select('*')
          .eq('phone', contactData.phone)
          .eq('company_id', companyId)
          .single()
        if (existing) {
          return NextResponse.json(existing)
        }
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Atribuir categorias se fornecidas
    if (category_ids && category_ids.length > 0 && data) {
      const assignments = category_ids.map((catId: string) => ({
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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Deletar assignments de categorias primeiro
    await serviceClient
      .from('contact_category_assignments')
      .delete()
      .eq('contact_id', id)

    // Deletar contato
    const { error } = await serviceClient
      .from('contacts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
