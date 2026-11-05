import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * Departamentos (filas de atendimento). Qualquer membro lista; só dono/admin altera.
 * A distribuição das conversas é feita no banco (trigger distribuir_conversa).
 */

async function membroAtual() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await createServiceRoleClient()
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .single()
  return data ? { companyId: data.company_id as string, admin: data.role === 'owner' || data.role === 'admin' } : null
}

const semPermissao = () => NextResponse.json({ error: 'Só o dono ou um administrador pode alterar departamentos' }, { status: 403 })

type Dados = { name?: unknown; color?: unknown; is_default?: unknown; auto_assign?: unknown; member_ids?: unknown }

function camposValidos(body: Dados) {
  const campos: Record<string, unknown> = {}
  if (typeof body.name === 'string') campos.name = body.name.trim().slice(0, 60)
  if (typeof body.color === 'string' && /^#[0-9a-f]{6}$/i.test(body.color)) campos.color = body.color
  if (typeof body.is_default === 'boolean') campos.is_default = body.is_default
  if (typeof body.auto_assign === 'boolean') campos.auto_assign = body.auto_assign
  return campos
}

// Mantém só agentes que são membros ativos da própria empresa
async function salvarMembros(companyId: string, departmentId: string, memberIds: unknown) {
  if (!Array.isArray(memberIds)) return
  const service = createServiceRoleClient()
  const { data: validos } = await service
    .from('company_members')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .in('user_id', memberIds.filter((m): m is string => typeof m === 'string'))
  await service.from('department_members').delete().eq('department_id', departmentId)
  const linhas = (validos || []).map((v) => ({ department_id: departmentId, agent_id: v.user_id }))
  if (linhas.length) await service.from('department_members').insert(linhas)
}

// Só um departamento padrão por empresa
async function garantirPadraoUnico(companyId: string, departmentId: string) {
  await createServiceRoleClient()
    .from('departments')
    .update({ is_default: false })
    .eq('company_id', companyId)
    .neq('id', departmentId)
}

export async function GET() {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const service = createServiceRoleClient()
  const { data: departamentos } = await service
    .from('departments')
    .select('id, name, color, is_default, auto_assign, created_at')
    .eq('company_id', membro.companyId)
    .order('created_at')

  const ids = (departamentos || []).map((d) => d.id)
  const { data: membros } = ids.length
    ? await service.from('department_members').select('department_id, agent_id').in('department_id', ids)
    : { data: [] }

  return NextResponse.json((departamentos || []).map((d) => ({
    ...d,
    member_ids: (membros || []).filter((m) => m.department_id === d.id).map((m) => m.agent_id),
  })))
}

export async function POST(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()

  const body: Dados = await request.json().catch(() => ({}))
  const campos = camposValidos(body)
  if (!campos.name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const { data, error } = await createServiceRoleClient()
    .from('departments')
    .insert({ ...campos, company_id: membro.companyId })
    .select('id')
    .single()
  if (error || !data) return NextResponse.json({ error: 'Erro ao criar departamento' }, { status: 500 })

  if (campos.is_default) await garantirPadraoUnico(membro.companyId, data.id)
  await salvarMembros(membro.companyId, data.id, body.member_ids)
  return NextResponse.json({ success: true, id: data.id })
}

export async function PATCH(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()

  const body: Dados & { id?: unknown } = await request.json().catch(() => ({}))
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  const campos = camposValidos(body)
  if (campos.name === '') return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const { data } = await createServiceRoleClient()
    .from('departments')
    .update(campos)
    .eq('id', body.id)
    .eq('company_id', membro.companyId)
    .select('id')
  if (!data || data.length === 0) return NextResponse.json({ error: 'Departamento não encontrado' }, { status: 404 })

  if (campos.is_default) await garantirPadraoUnico(membro.companyId, body.id)
  await salvarMembros(membro.companyId, body.id, body.member_ids)
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  // As conversas do departamento ficam sem departamento (FK ON DELETE SET NULL)
  await createServiceRoleClient().from('departments').delete().eq('id', id).eq('company_id', membro.companyId)
  return NextResponse.json({ success: true })
}
