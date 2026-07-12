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

const PRESET_FLOWS = [
  {
    name: 'Atendimento Geral',
    description: 'Menu inicial com opções de departamento',
    trigger_type: 'first_message',
    trigger_keywords: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'menu'],
    nodes: [
      { title: 'Boas-vindas', node_type: 'options', is_start: true, message: 'Olá! 👋 Bem-vindo(a)! Como posso ajudar?\n\nEscolha uma opção:\n1️⃣ Vendas\n2️⃣ Suporte\n3️⃣ Financeiro\n4️⃣ Falar com atendente', options: [{ value: '1', label: 'Vendas' }, { value: '2', label: 'Suporte' }, { value: '3', label: 'Financeiro' }, { value: '4', label: 'Atendente' }] },
      { title: 'Vendas', node_type: 'message', message: '🛒 Departamento de Vendas!\n\nNosso time comercial vai atendê-lo em instantes. Enquanto isso, pode me dizer o que procura?' },
      { title: 'Suporte', node_type: 'message', message: '🔧 Suporte Técnico!\n\nDescreva seu problema que vamos te ajudar o mais rápido possível.' },
      { title: 'Financeiro', node_type: 'message', message: '💰 Departamento Financeiro!\n\nPodemos ajudar com boletos, notas fiscais e pagamentos. Um atendente será designado em breve.' },
      { title: 'Transferir', node_type: 'action', action_type: 'transfer_agent', message: 'Transferindo para um atendente humano... Aguarde um momento! 🙏' },
    ],
  },
  {
    name: 'Qualificação de Lead',
    description: 'Coleta informações do lead antes de transferir',
    trigger_type: 'keyword',
    trigger_keywords: ['quero saber mais', 'interesse', 'preço', 'valor', 'orçamento'],
    nodes: [
      { title: 'Interesse', node_type: 'options', is_start: true, message: 'Que bom que tem interesse! 🎉\n\nPara te atender melhor, me diz:\n\n1️⃣ Sou pessoa física\n2️⃣ Sou empresa\n3️⃣ Só quero ver preços', options: [{ value: '1', label: 'Pessoa Física' }, { value: '2', label: 'Empresa' }, { value: '3', label: 'Ver preços' }] },
      { title: 'Pessoa Física', node_type: 'message', message: '👤 Perfeito! Para pessoas físicas temos planos a partir de R$99/mês.\n\nQuer que um consultor entre em contato?' },
      { title: 'Empresa', node_type: 'message', message: '🏢 Ótimo! Para empresas temos planos especiais.\n\nQuantos atendentes sua equipe tem?' },
      { title: 'Preços', node_type: 'message', message: '💰 Nossos planos:\n\n• Starter: R$99/mês (2 atendentes)\n• Premium: R$219/mês (5 atendentes)\n• Business: R$497/mês (15 atendentes)\n\nQual te interessa mais?' },
    ],
  },
  {
    name: 'Fora do Horário',
    description: 'Resposta automática fora do expediente',
    trigger_type: 'always',
    trigger_keywords: [],
    nodes: [
      { title: 'Ausência', node_type: 'message', is_start: true, message: '⏰ Olá! No momento estamos fora do horário de atendimento.\n\nNosso horário: Seg-Sex, 08h às 18h.\n\nDeixe sua mensagem que retornaremos assim que possível! 📩' },
    ],
  },
]

// GET - Listar fluxos
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 400 })

    const serviceClient = createServiceRoleClient()

    const { data: flows } = await serviceClient
      .from('chatbot_flows')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    // Buscar nós de cada fluxo
    const flowIds = (flows || []).map(f => f.id)
    let nodes: any[] = []
    if (flowIds.length > 0) {
      const { data: allNodes } = await serviceClient
        .from('chatbot_nodes')
        .select('*')
        .in('flow_id', flowIds)
        .order('created_at', { ascending: true })
      nodes = allNodes || []
    }

    // Agrupar nós por fluxo
    const flowsWithNodes = (flows || []).map(flow => ({
      ...flow,
      nodes: nodes.filter(n => n.flow_id === flow.id),
    }))

    return NextResponse.json({ flows: flowsWithNodes, presets: PRESET_FLOWS })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar fluxo (ou importar preset)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 400 })

    const body = await request.json()
    const { name, description, trigger_type, trigger_keywords, nodes, preset_index } = body

    const serviceClient = createServiceRoleClient()

    // Se é um preset
    if (preset_index !== undefined && PRESET_FLOWS[preset_index]) {
      const preset = PRESET_FLOWS[preset_index]
      const { data: flow } = await serviceClient
        .from('chatbot_flows')
        .insert({
          company_id: companyId,
          name: preset.name,
          description: preset.description,
          trigger_type: preset.trigger_type,
          trigger_keywords: preset.trigger_keywords,
        })
        .select()
        .single()

      if (flow) {
        // Criar nós
        const createdNodes: any[] = []
        for (const node of preset.nodes) {
          const { data: createdNode } = await serviceClient
            .from('chatbot_nodes')
            .insert({ flow_id: flow.id, ...node })
            .select()
            .single()
          if (createdNode) createdNodes.push(createdNode)
        }

        // Conectar opções ao próximo nó (simplificado: opção 1 -> nó 2, opção 2 -> nó 3, etc)
        const startNode = createdNodes.find(n => n.is_start)
        if (startNode && startNode.options) {
          const updatedOptions = startNode.options.map((opt: any, idx: number) => ({
            ...opt,
            next_node_id: createdNodes[idx + 1]?.id || null,
          }))
          await serviceClient
            .from('chatbot_nodes')
            .update({ options: updatedOptions })
            .eq('id', startNode.id)
        }

        return NextResponse.json(flow)
      }
    }

    // Criação manual
    const { data: flow, error } = await serviceClient
      .from('chatbot_flows')
      .insert({
        company_id: companyId,
        name: name || 'Novo Fluxo',
        description: description || null,
        trigger_type: trigger_type || 'keyword',
        trigger_keywords: trigger_keywords || [],
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Criar nós se fornecidos
    if (nodes && nodes.length > 0 && flow) {
      for (const node of nodes) {
        await serviceClient
          .from('chatbot_nodes')
          .insert({ flow_id: flow.id, ...node })
      }
    }

    return NextResponse.json(flow)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - Atualizar fluxo (ativar/desativar, editar)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const companyId = await getUserCompanyId(session.user.id)
    if (!companyId) return NextResponse.json({ error: 'Sem empresa' }, { status: 400 })

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from('chatbot_flows')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Excluir fluxo
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
    await serviceClient.from('chatbot_flows').delete().eq('id', id).eq('company_id', companyId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
