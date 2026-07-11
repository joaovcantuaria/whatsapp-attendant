import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

// GET - Buscar leads para o CRM
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar company do usuario
    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Sem empresa' }, { status: 403 })
    }

    // Buscar contatos com informações de CRM
    const { data: contacts } = await serviceClient
      .from('contacts')
      .select(`
        id,
        name,
        phone,
        tags,
        notes,
        crm_stage,
        crm_company,
        created_at
      `)
      .eq('company_id', member.company_id)
      .order('created_at', { ascending: false })

    if (!contacts) {
      return NextResponse.json([])
    }

    // Buscar conversas para saber agentes atribuidos
    const contactIds = contacts.map(c => c.id)
    const { data: conversations } = await serviceClient
      .from('conversations')
      .select('contact_id, agent_id, agents:agent_id(name)')
      .eq('company_id', member.company_id)
      .in('contact_id', contactIds.length > 0 ? contactIds : ['none'])

    // Mapear agentes por contato
    const agentsByContact: Record<string, { name: string; color: string }[]> = {}
    const colors = ['#3b82f6', '#22c55e', '#ef4444', '#eab308', '#8b5cf6', '#f97316']
    
    conversations?.forEach((conv: any) => {
      if (conv.agent_id && conv.agents) {
        if (!agentsByContact[conv.contact_id]) {
          agentsByContact[conv.contact_id] = []
        }
        const existing = agentsByContact[conv.contact_id].find(a => a.name === conv.agents.name)
        if (!existing) {
          agentsByContact[conv.contact_id].push({
            name: conv.agents.name,
            color: colors[agentsByContact[conv.contact_id].length % colors.length],
          })
        }
      }
    })

    // Formatar leads
    const leads = contacts.map((contact) => ({
      id: contact.id,
      name: contact.name || contact.phone,
      company: contact.crm_company || null,
      phone: contact.phone,
      tags: contact.tags || [],
      assignedAgents: agentsByContact[contact.id] || [],
      attachments: 0,
      stage: contact.crm_stage || 'initial',
      created_at: contact.created_at,
      contact_id: contact.id,
    }))

    return NextResponse.json(leads)
  } catch (error) {
    console.error('CRM API Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - Mover lead de estágio
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { leadId, stage } = body

    if (!leadId || !stage) {
      return NextResponse.json({ error: 'leadId e stage são obrigatórios' }, { status: 400 })
    }

    const validStages = ['initial', 'contacted', 'registered', 'completed']
    if (!validStages.includes(stage)) {
      return NextResponse.json({ error: 'Estágio inválido' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient
      .from('contacts')
      .update({ crm_stage: stage, updated_at: new Date().toISOString() })
      .eq('id', leadId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('CRM PATCH Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
