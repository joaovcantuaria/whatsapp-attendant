import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

/**
 * Webhook externo para integrações de terceiros.
 * Permite que sistemas externos recebam eventos do BoraGerir.
 * 
 * Eventos disponíveis:
 * - message.received: Nova mensagem recebida
 * - message.sent: Mensagem enviada
 * - conversation.created: Nova conversa criada
 * - conversation.closed: Conversa encerrada
 * - conversation.assigned: Conversa atribuída a um agente
 * 
 * Formato do payload:
 * {
 *   event: string,
 *   timestamp: string,
 *   data: { ... }
 * }
 */

// POST - Registrar um webhook externo
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json({ error: 'API key obrigatória' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    // Validar API key e buscar empresa
    const { data: company } = await serviceClient
      .from('companies')
      .select('id')
      .eq('webhook_verify_token', apiKey)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'API key inválida' }, { status: 403 })
    }

    const body = await request.json()
    const { url, events } = body

    if (!url) {
      return NextResponse.json({ error: 'URL do webhook obrigatória' }, { status: 400 })
    }

    // Salvar webhook
    const { data: webhook, error } = await serviceClient
      .from('external_webhooks')
      .upsert({
        company_id: company.id,
        url,
        events: events || ['message.received', 'message.sent', 'conversation.created'],
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,url' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Webhook registrado com sucesso',
      webhook,
    })
  } catch (error) {
    console.error('External webhook error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// GET - Listar webhooks ativos de uma empresa
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json({ error: 'API key obrigatória' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: company } = await serviceClient
      .from('companies')
      .select('id')
      .eq('webhook_verify_token', apiKey)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'API key inválida' }, { status: 403 })
    }

    const { data: webhooks } = await serviceClient
      .from('external_webhooks')
      .select('*')
      .eq('company_id', company.id)
      .eq('is_active', true)

    return NextResponse.json(webhooks || [])
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
