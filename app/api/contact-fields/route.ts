import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { membroAtual } from '@/lib/membro-atual'
import { TIPOS_CAMPO, chaveDoRotulo } from '@/lib/campos-personalizados'

export const dynamic = 'force-dynamic'

// Definições de campos personalizados de contato. Lista: membros. Alterar: dono/admin.
const LIMITE_CAMPOS = 30
const semPermissao = () => NextResponse.json({ error: 'Só o dono ou um administrador pode alterar os campos' }, { status: 403 })

function opcoesValidas(type: string, options: unknown): string[] | null {
  if (type !== 'lista') return null
  if (!Array.isArray(options)) return []
  return Array.from(new Set(options.map((o) => String(o).trim().slice(0, 60)).filter(Boolean))).slice(0, 30)
}

export async function GET() {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data } = await createServiceRoleClient()
    .from('contact_field_definitions')
    .select('id, key, label, type, options, position')
    .eq('company_id', membro.companyId)
    .order('position')
    .order('created_at')
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()

  const { label, type, options } = await request.json().catch(() => ({}))
  const rotulo = typeof label === 'string' ? label.trim().slice(0, 60) : ''
  const key = chaveDoRotulo(rotulo)
  if (!rotulo || !key) return NextResponse.json({ error: 'Dê um nome ao campo' }, { status: 400 })
  if (!TIPOS_CAMPO.includes(type)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  const opcoes = opcoesValidas(type, options)
  if (type === 'lista' && (!opcoes || opcoes.length < 2)) return NextResponse.json({ error: 'Informe pelo menos 2 opções' }, { status: 400 })

  const service = createServiceRoleClient()
  const { count } = await service.from('contact_field_definitions').select('id', { count: 'exact', head: true }).eq('company_id', membro.companyId)
  if ((count || 0) >= LIMITE_CAMPOS) return NextResponse.json({ error: `Limite de ${LIMITE_CAMPOS} campos` }, { status: 400 })

  const { error } = await service.from('contact_field_definitions').insert({
    company_id: membro.companyId, key, label: rotulo, type, options: opcoes, position: count || 0,
  })
  if (error) {
    return NextResponse.json({ error: error.code === '23505' ? 'Já existe um campo com esse nome' : 'Erro ao criar campo' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

// Renomear / trocar opções (a chave fica fixa para não perder os valores já salvos)
export async function PATCH(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()

  const { id, label, options } = await request.json().catch(() => ({}))
  if (typeof id !== 'string') return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  const service = createServiceRoleClient()
  const { data: atual } = await service.from('contact_field_definitions').select('type').eq('id', id).eq('company_id', membro.companyId).single()
  if (!atual) return NextResponse.json({ error: 'Campo não encontrado' }, { status: 404 })

  const mudancas: Record<string, unknown> = {}
  if (typeof label === 'string' && label.trim()) mudancas.label = label.trim().slice(0, 60)
  if (atual.type === 'lista' && options !== undefined) {
    const opcoes = opcoesValidas('lista', options)
    if (!opcoes || opcoes.length < 2) return NextResponse.json({ error: 'Informe pelo menos 2 opções' }, { status: 400 })
    mudancas.options = opcoes
  }
  await service.from('contact_field_definitions').update(mudancas).eq('id', id).eq('company_id', membro.companyId)
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  await createServiceRoleClient().from('contact_field_definitions').delete().eq('id', id).eq('company_id', membro.companyId)
  return NextResponse.json({ success: true })
}
