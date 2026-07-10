import { createServiceRoleClient } from './supabase-server'

export async function checkConversationLimit(companyId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  // Buscar plano da empresa
  const { data: company } = await supabase
    .from('companies')
    .select('plan_id, plans(max_conversations_per_month)')
    .eq('id', companyId)
    .single()

  if (!company?.plans) return true // Sem plano definido = sem limite

  const planData = Array.isArray(company.plans) ? company.plans[0] : company.plans
  const maxConversations = (planData as any)?.max_conversations_per_month

  if (!maxConversations) return true // Plano sem limite

  // Buscar uso do mês atual
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: usage } = await supabase
    .from('usage_logs')
    .select('conversations_count')
    .eq('company_id', companyId)
    .eq('month', currentMonth)
    .single()

  const currentCount = usage?.conversations_count || 0
  return currentCount < maxConversations
}

export async function checkAgentLimit(companyId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { data: company } = await supabase
    .from('companies')
    .select('plan_id, plans(max_agents)')
    .eq('id', companyId)
    .single()

  if (!company?.plans) return true

  const planData = Array.isArray(company.plans) ? company.plans[0] : company.plans
  const maxAgents = (planData as any)?.max_agents || 3

  // Contar membros ativos
  const { count } = await supabase
    .from('company_members')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('is_active', true)

  return (count || 0) < maxAgents
}

export async function incrementUsage(
  companyId: string,
  type: 'conversation' | 'message_sent' | 'message_received'
) {
  const supabase = createServiceRoleClient()
  const currentMonth = new Date().toISOString().slice(0, 7)

  // Upsert: criar registro do mês se não existir
  const { data: existing } = await supabase
    .from('usage_logs')
    .select('id, conversations_count, messages_sent, messages_received')
    .eq('company_id', companyId)
    .eq('month', currentMonth)
    .single()

  if (!existing) {
    await supabase.from('usage_logs').insert({
      company_id: companyId,
      month: currentMonth,
      conversations_count: type === 'conversation' ? 1 : 0,
      messages_sent: type === 'message_sent' ? 1 : 0,
      messages_received: type === 'message_received' ? 1 : 0,
    })
  } else {
    const updates: Record<string, number> = {}
    if (type === 'conversation') updates.conversations_count = existing.conversations_count + 1
    if (type === 'message_sent') updates.messages_sent = existing.messages_sent + 1
    if (type === 'message_received') updates.messages_received = existing.messages_received + 1

    await supabase.from('usage_logs').update(updates).eq('id', existing.id)
  }
}

export function isCompanyActive(planStatus: string, trialEndsAt: string | null): boolean {
  if (planStatus === 'active') return true
  if (planStatus === 'trial' && trialEndsAt) {
    return new Date(trialEndsAt) > new Date()
  }
  return false
}
