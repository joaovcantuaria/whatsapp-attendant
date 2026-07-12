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

// GET - Buscar config do agente IA
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 400 })

    const serviceClient = createServiceRoleClient()
    let { data: config } = await serviceClient
      .from('ai_agent_config')
      .select('*')
      .eq('company_id', companyId)
      .single()

    // Se não existe, criar config padrão
    if (!config) {
      const { data: newConfig } = await serviceClient
        .from('ai_agent_config')
        .insert({ company_id: companyId })
        .select()
        .single()
      config = newConfig
    }

    // Buscar logs recentes
    const { data: logs } = await serviceClient
      .from('ai_agent_logs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50)

    // Calcular stats
    const { count: totalMessages } = await serviceClient
      .from('ai_agent_logs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    const { count: totalTransfers } = await serviceClient
      .from('ai_agent_logs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('transferred', true)

    return NextResponse.json({
      config,
      logs: logs || [],
      stats: {
        totalMessages: totalMessages || 0,
        totalTransfers: totalTransfers || 0,
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Atualizar config do agente IA
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 400 })

    const body = await request.json()
    const {
      is_active, provider, api_key, model, system_prompt, greeting_message,
      transfer_keywords, max_messages_before_transfer,
      active_hours_start, active_hours_end, active_days,
      temperature, max_tokens, context_messages,
    } = body

    const serviceClient = createServiceRoleClient()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (is_active !== undefined) updates.is_active = is_active
    if (provider !== undefined) updates.provider = provider
    if (api_key !== undefined) updates.api_key = api_key
    if (model) updates.model = model
    if (system_prompt) updates.system_prompt = system_prompt
    if (greeting_message) updates.greeting_message = greeting_message
    if (transfer_keywords) updates.transfer_keywords = transfer_keywords
    if (max_messages_before_transfer) updates.max_messages_before_transfer = max_messages_before_transfer
    if (active_hours_start) updates.active_hours_start = active_hours_start
    if (active_hours_end) updates.active_hours_end = active_hours_end
    if (active_days) updates.active_days = active_days
    if (temperature !== undefined) updates.temperature = temperature
    if (max_tokens) updates.max_tokens = max_tokens
    if (context_messages) updates.context_messages = context_messages

    const { data, error } = await serviceClient
      .from('ai_agent_config')
      .update(updates)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
