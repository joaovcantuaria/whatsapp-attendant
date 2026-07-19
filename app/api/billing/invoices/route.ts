import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import type { InvoicesResponse } from '@/types/billing'

export async function GET(req: NextRequest) {
  try {
    // Validate session
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Get agent to find company_id
    const serviceClient = createServiceRoleClient()
    const { data: agent } = await serviceClient
      .from('agents')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
    }

    // Parse query params
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    // Build query
    let query = serviceClient
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('company_id', agent.company_id)
      .order('created_at', { ascending: false })

    if (status && ['approved', 'pending', 'rejected'].includes(status)) {
      query = query.eq('status', status)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: invoices, count, error } = await query

    if (error) {
      console.error('[invoices] Query error:', error)
      return NextResponse.json({ error: 'Erro ao buscar faturas' }, { status: 500 })
    }

    const response: InvoicesResponse = {
      invoices: invoices || [],
      total: count || 0,
      page,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[invoices] Error:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar faturas' },
      { status: 500 }
    )
  }
}
