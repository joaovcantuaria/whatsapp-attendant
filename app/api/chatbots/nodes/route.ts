import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// POST - Salvar todos os nós de um fluxo (replace all)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { flow_id, nodes, edges } = body

    if (!flow_id || !nodes) {
      return NextResponse.json({ error: 'flow_id e nodes são obrigatórios' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Deletar nós existentes
    await serviceClient
      .from('chatbot_nodes')
      .delete()
      .eq('flow_id', flow_id)

    // Criar mapeamento de IDs temporários para novos IDs
    const idMap: Record<string, string> = {}
    const createdNodes: any[] = []

    for (const node of nodes) {
      const { data: created } = await serviceClient
        .from('chatbot_nodes')
        .insert({
          flow_id,
          node_type: node.node_type === 'condition' ? 'options' : node.node_type,
          title: node.title || 'Nó',
          message: node.message,
          options: node.options,
          action_type: node.action_type,
          action_data: node.action_data,
          delay_seconds: node.delay_seconds || 0,
          position_x: node.position_x || 0,
          position_y: node.position_y || 0,
          is_start: node.is_start || false,
        })
        .select()
        .single()

      if (created) {
        idMap[node.id] = created.id
        createdNodes.push(created)
      }
    }

    // Atualizar opções com next_node_id baseado nas edges
    if (edges && edges.length > 0) {
      for (const edge of edges) {
        const sourceDbId = idMap[edge.source]
        const targetDbId = idMap[edge.target]

        if (!sourceDbId || !targetDbId) continue

        // Buscar nó source
        const sourceNode = createdNodes.find(n => n.id === sourceDbId)
        if (sourceNode && sourceNode.options) {
          // Atualizar a próxima opção sem next_node_id
          const updatedOptions = [...sourceNode.options]
          const emptyOpt = updatedOptions.find((o: any) => !o.next_node_id)
          if (emptyOpt) {
            emptyOpt.next_node_id = targetDbId
          } else {
            // Atribuir à primeira opção
            if (updatedOptions.length > 0) {
              updatedOptions[0].next_node_id = targetDbId
            }
          }
          await serviceClient
            .from('chatbot_nodes')
            .update({ options: updatedOptions })
            .eq('id', sourceDbId)
        } else if (sourceNode && sourceNode.node_type !== 'options') {
          // Para nós de mensagem/ação, guardar next_node_id nas options como array simples
          await serviceClient
            .from('chatbot_nodes')
            .update({ options: [{ next_node_id: targetDbId }] })
            .eq('id', sourceDbId)
        }
      }
    }

    return NextResponse.json({ success: true, count: createdNodes.length })
  } catch (error) {
    console.error('Save nodes error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
