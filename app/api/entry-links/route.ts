import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { membroAtual } from '@/lib/membro-atual'
import { gerarCodigoLink } from '@/lib/links-entrada'

export const dynamic = 'force-dynamic'

// Links de entrada (wa.me com código). Lista: membros. Criar/excluir: dono/admin.
const LIMITE_LINKS = 50
const semPermissao = () => NextResponse.json({ error: 'Só o dono ou um administrador pode alterar links' }, { status: 403 })

export async function GET() {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const supabase = createServiceRoleClient()
  const [{ data: links }, { data: company }] = await Promise.all([
    supabase.from('entry_links')
      .select('id, name, code, phone, message, department_id, tag, uses, created_at')
      .eq('company_id', membro.companyId).order('created_at', { ascending: false }),
    supabase.from('companies').select('phone').eq('id', membro.companyId).single(),
  ])
  return NextResponse.json({ links: links || [], telefone_empresa: company?.phone || '', admin: membro.admin })
}

export async function POST(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()

  const { name, phone, message, department_id, tag } = await request.json().catch(() => ({}))
  const nome = typeof name === 'string' ? name.trim().slice(0, 60) : ''
  const telefone = typeof phone === 'string' ? phone.replace(/\D/g, '') : ''
  const mensagem = typeof message === 'string' ? message.trim().slice(0, 300) : ''
  if (!nome) return NextResponse.json({ error: 'Dê um nome ao link (ex.: Instagram)' }, { status: 400 })
  if (telefone.length < 12 || telefone.length > 13) return NextResponse.json({ error: 'Informe o WhatsApp com DDI e DDD (ex.: 5538999999999)' }, { status: 400 })
  if (!mensagem) return NextResponse.json({ error: 'Escreva a mensagem que o cliente vai enviar' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { count } = await supabase.from('entry_links').select('id', { count: 'exact', head: true }).eq('company_id', membro.companyId)
  if ((count || 0) >= LIMITE_LINKS) return NextResponse.json({ error: `Limite de ${LIMITE_LINKS} links` }, { status: 400 })

  if (typeof department_id === 'string' && department_id) {
    const { data: dep } = await supabase.from('departments').select('id').eq('id', department_id).eq('company_id', membro.companyId).maybeSingle()
    if (!dep) return NextResponse.json({ error: 'Departamento inválido' }, { status: 400 })
  }

  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const { error } = await supabase.from('entry_links').insert({
      company_id: membro.companyId,
      name: nome,
      code: gerarCodigoLink(nome),
      phone: telefone,
      message: mensagem,
      department_id: typeof department_id === 'string' && department_id ? department_id : null,
      tag: typeof tag === 'string' && tag.trim() ? tag.trim().slice(0, 40) : null,
    })
    if (!error) return NextResponse.json({ success: true })
    if (error.code !== '23505') break // só repete se o código sorteado já existia
  }
  return NextResponse.json({ error: 'Erro ao criar link' }, { status: 500 })
}

export async function DELETE(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  await createServiceRoleClient().from('entry_links').delete().eq('id', id).eq('company_id', membro.companyId)
  return NextResponse.json({ success: true })
}
