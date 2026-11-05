import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { membroAtual } from '@/lib/membro-atual'
import { VARIAVEIS_POR_TIPO, type TipoAutomacao } from '@/lib/automacoes-regras'

export const dynamic = 'force-dynamic'

const TIPOS: TipoAutomacao[] = ['aniversario', 'reativacao', 'lembrete_agendamento']

// GET — automações da empresa, vínculo com o App e últimos envios
export async function GET() {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const supabase = createServiceRoleClient()
  const [{ data: automacoes }, { data: link }, { data: envios }, { data: company }] = await Promise.all([
    supabase.from('automations').select('id, type, is_active, template_name, template_language, vars, config, last_run_at').eq('company_id', membro.companyId),
    supabase.from('app_links').select('empresa_nome, linked_at').eq('company_id', membro.companyId).maybeSingle(),
    supabase.from('automation_sends').select('automation_id, contact_name, phone, status, detail, created_at')
      .eq('company_id', membro.companyId).order('created_at', { ascending: false }).limit(60),
    supabase.from('companies').select('whatsapp_token, whatsapp_phone_number_id').eq('id', membro.companyId).single(),
  ])
  return NextResponse.json({
    vinculado: !!link,
    empresa_nome: link?.empresa_nome || null,
    api_oficial: !!(company?.whatsapp_token && company?.whatsapp_phone_number_id),
    admin: membro.admin,
    automacoes: automacoes || [],
    envios: envios || [],
  })
}

// PUT — cria ou atualiza a automação de um tipo
export async function PUT(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return NextResponse.json({ error: 'Só o dono ou um administrador pode alterar automações' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const type = body.type as TipoAutomacao
  if (!TIPOS.includes(type)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  const permitidas = VARIAVEIS_POR_TIPO[type]
  const vars: string[] = Array.isArray(body.vars)
    ? body.vars.filter((v: unknown): v is string => typeof v === 'string' && permitidas.includes(v)).slice(0, 10)
    : []
  const c = body.config || {}
  const hora = typeof c.hora_envio === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(c.hora_envio) ? c.hora_envio : '09:00'
  const cupomValido = !!c.cupom && (c.cupom.tipo === 'percentual' || c.cupom.tipo === 'fixo') && Number(c.cupom.valor) > 0
    && (c.cupom.tipo !== 'percentual' || Number(c.cupom.valor) <= 100)
  const config = {
    hora_envio: hora,
    limite_diario: Math.min(1000, Math.max(1, Number(c.limite_diario) || 200)),
    ...(type === 'reativacao' ? { dias_inatividade: Math.min(730, Math.max(15, Number(c.dias_inatividade) || 60)) } : {}),
    ...(type === 'lembrete_agendamento' ? { antecedencia_horas: Math.min(72, Math.max(1, Number(c.antecedencia_horas) || 24)) } : {}),
    cupom: type !== 'lembrete_agendamento' && cupomValido
      ? { tipo: c.cupom.tipo, valor: Number(c.cupom.valor), validade_dias: Math.min(90, Math.max(1, Number(c.cupom.validade_dias) || 7)) }
      : null,
  }

  const isActive = !!body.is_active
  const templateName = typeof body.template_name === 'string' && body.template_name ? body.template_name : null
  if (isActive && !templateName) return NextResponse.json({ error: 'Escolha um template aprovado antes de ativar' }, { status: 400 })
  if (isActive && (vars.includes('cupom') || vars.includes('desconto')) && !config.cupom) {
    return NextResponse.json({ error: 'O template usa cupom/desconto: configure o desconto' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  if (isActive) {
    const { data: link } = await supabase.from('app_links').select('id').eq('company_id', membro.companyId).maybeSingle()
    if (!link) return NextResponse.json({ error: 'Conecte o Bora Gerir App antes de ativar (no App: Configurações → Chat)' }, { status: 400 })
  }

  const { error } = await supabase.from('automations').upsert({
    company_id: membro.companyId,
    type,
    is_active: isActive,
    template_name: templateName,
    template_language: typeof body.template_language === 'string' ? body.template_language : 'pt_BR',
    vars,
    config,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id,type' })
  if (error) return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  return NextResponse.json({ success: true })
}
