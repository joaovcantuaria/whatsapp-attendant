import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { membroAtual } from '@/lib/membro-atual'

export const dynamic = 'force-dynamic'

// Automações por etapa do funil. Lista: membros. Criar/excluir/ligar: dono/admin.
const ACOES = ['criar_tarefa', 'enviar_template', 'enviar_texto']
const semPermissao = () => NextResponse.json({ error: 'Só o dono ou um administrador pode alterar automações' }, { status: 403 })

function configValida(action: string, config: Record<string, unknown>): Record<string, unknown> | string {
  if (action === 'criar_tarefa') {
    const titulo = String(config.titulo || '').trim().slice(0, 200)
    if (!titulo) return 'Informe o título da tarefa'
    return { titulo, prazo_dias: Math.max(0, Math.min(365, Math.round(Number(config.prazo_dias) || 0))) }
  }
  if (action === 'enviar_template') {
    const template_name = String(config.template_name || '').trim()
    if (!template_name) return 'Escolha um template aprovado'
    return { template_name, template_language: String(config.template_language || 'pt_BR') }
  }
  const texto = String(config.texto || '').trim().slice(0, 1000)
  if (!texto) return 'Escreva o texto da mensagem'
  return { texto }
}

export async function GET(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  let consulta = createServiceRoleClient()
    .from('crm_stage_automations')
    .select('id, stage_id, action, config, is_active, created_at')
    .eq('company_id', membro.companyId)
    .order('created_at')
  const stageId = request.nextUrl.searchParams.get('stage_id')
  if (stageId) consulta = consulta.eq('stage_id', stageId)
  const { data } = await consulta
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()

  const { stage_id, action, config } = await request.json().catch(() => ({}))
  if (typeof stage_id !== 'string' || !ACOES.includes(action)) return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })

  const service = createServiceRoleClient()
  // A etapa precisa ser de um funil da própria empresa
  const { data: etapa } = await service
    .from('crm_pipeline_stages').select('id, crm_pipelines!inner(company_id)')
    .eq('id', stage_id).eq('crm_pipelines.company_id', membro.companyId).maybeSingle()
  if (!etapa) return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 })

  const valida = configValida(action, (config || {}) as Record<string, unknown>)
  if (typeof valida === 'string') return NextResponse.json({ error: valida }, { status: 400 })

  const { error } = await service.from('crm_stage_automations').insert({ company_id: membro.companyId, stage_id, action, config: valida })
  if (error) return NextResponse.json({ error: 'Erro ao criar automação' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()
  const { id, is_active } = await request.json().catch(() => ({}))
  if (typeof id !== 'string' || typeof is_active !== 'boolean') return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })
  await createServiceRoleClient().from('crm_stage_automations').update({ is_active }).eq('id', id).eq('company_id', membro.companyId)
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  await createServiceRoleClient().from('crm_stage_automations').delete().eq('id', id).eq('company_id', membro.companyId)
  return NextResponse.json({ success: true })
}
