import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { membroAtual } from '@/lib/membro-atual'
import { importarSite } from '@/lib/importar-site'

export const dynamic = 'force-dynamic'

/**
 * Base de conhecimento do Agente de IA. Lista: membros. Criar/editar/excluir: dono/admin.
 * POST { title, content } ou { url } (importa o texto da página).
 */

const LIMITE_CONTEUDO = 50_000
const LIMITE_DOCUMENTOS = 200

const semPermissao = () => NextResponse.json({ error: 'Só o dono ou um administrador pode alterar a base de conhecimento' }, { status: 403 })

export async function GET() {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data } = await createServiceRoleClient()
    .from('ai_knowledge')
    .select('id, title, content, source_url, updated_at')
    .eq('company_id', membro.companyId)
    .order('updated_at', { ascending: false })
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()

  const service = createServiceRoleClient()
  const { count } = await service.from('ai_knowledge').select('id', { count: 'exact', head: true }).eq('company_id', membro.companyId)
  if ((count || 0) >= LIMITE_DOCUMENTOS) return NextResponse.json({ error: `Limite de ${LIMITE_DOCUMENTOS} documentos atingido` }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  let title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : ''
  let content = typeof body.content === 'string' ? body.content.trim().slice(0, LIMITE_CONTEUDO) : ''
  let sourceUrl: string | null = null

  if (typeof body.url === 'string' && body.url.trim()) {
    const site = await importarSite(body.url.trim())
    if (!site.ok) return NextResponse.json({ error: site.erro }, { status: 400 })
    title = title || site.titulo
    content = site.texto
    sourceUrl = body.url.trim()
  }

  if (!title || !content) return NextResponse.json({ error: 'Informe título e conteúdo (ou um endereço de site)' }, { status: 400 })

  const { data, error } = await service
    .from('ai_knowledge')
    .insert({ company_id: membro.companyId, title, content, source_url: sourceUrl })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id })
}

export async function PATCH(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()

  const body = await request.json().catch(() => ({}))
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : ''
  const content = typeof body.content === 'string' ? body.content.trim().slice(0, LIMITE_CONTEUDO) : ''
  if (!title || !content) return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 })

  const { data } = await createServiceRoleClient()
    .from('ai_knowledge')
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('company_id', membro.companyId)
    .select('id')
  if (!data || data.length === 0) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return semPermissao()

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  await createServiceRoleClient().from('ai_knowledge').delete().eq('id', id).eq('company_id', membro.companyId)
  return NextResponse.json({ success: true })
}
