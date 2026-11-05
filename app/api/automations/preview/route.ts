import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { membroAtual } from '@/lib/membro-atual'
import { buscarAlvos } from '@/lib/automacoes'
import { variantesTelefone, type TipoAutomacao } from '@/lib/automacoes-regras'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET /api/automations/preview?type=... — quem receberia AGORA (nada é enviado)
export async function GET(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const params = request.nextUrl.searchParams
  const type = params.get('type') as TipoAutomacao
  if (!['aniversario', 'reativacao', 'lembrete_agendamento'].includes(type)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  const config = {
    dias_inatividade: Number(params.get('dias_inatividade')) || 60,
    antecedencia_horas: Number(params.get('antecedencia_horas')) || 24,
  }
  const r = await buscarAlvos({ company_id: membro.companyId, type, config })
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 502 })

  const supabase = createServiceRoleClient()
  const { data: automacao } = await supabase.from('automations').select('id').eq('company_id', membro.companyId).eq('type', type).maybeSingle()
  const telefones = r.alvos.flatMap((a) => variantesTelefone(a.telefone))
  const { data: descadastrados } = telefones.length
    ? await supabase.from('contacts').select('phone').eq('company_id', membro.companyId).eq('opted_out', true).in('phone', telefones)
    : { data: [] as { phone: string }[] }
  const { data: jaEnviados } = automacao
    ? await supabase.from('automation_sends').select('phone, reference').eq('automation_id', automacao.id).in('reference', r.alvos.map((a) => a.referencia))
    : { data: [] as { phone: string; reference: string }[] }

  const saiu = new Set((descadastrados || []).map((d) => d.phone))
  const enviado = new Set((jaEnviados || []).map((e) => `${e.phone}|${e.reference}`))

  return NextResponse.json({
    total: r.alvos.length,
    alvos: r.alvos.slice(0, 100).map((a) => ({
      nome: a.nome,
      telefone: a.telefone.replace(/(\d{4})\d{5}(\d{4})$/, '$1*****$2'),
      situacao: variantesTelefone(a.telefone).some((t) => saiu.has(t))
        ? 'descadastrado'
        : enviado.has(`${a.telefone}|${a.referencia}`) ? 'ja_enviado' : 'vai_receber',
      detalhe: a.dataHora || (a.diasSemVisita ? `${a.diasSemVisita} dias sem visita` : a.idade ? `faz ${a.idade} anos` : ''),
    })),
  })
}
