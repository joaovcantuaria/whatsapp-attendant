import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { membroAtual } from '@/lib/membro-atual'
import { horarioValido } from '@/lib/ausencia'

export const dynamic = 'force-dynamic'

export async function GET() {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await createServiceRoleClient()
    .from('companies')
    .select('business_hours, away_enabled, away_message, whatsapp_token, whatsapp_phone_number_id')
    .eq('id', membro.companyId)
    .single()

  return NextResponse.json({
    business_hours: data?.business_hours ?? null,
    away_enabled: !!data?.away_enabled,
    away_message: data?.away_message ?? '',
    api_oficial: !!(data?.whatsapp_token && data?.whatsapp_phone_number_id),
  })
}

export async function PUT(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!membro.admin) return NextResponse.json({ error: 'Só o dono ou um administrador pode alterar' }, { status: 403 })

  const { business_hours, away_enabled, away_message } = await request.json().catch(() => ({}))
  if (business_hours !== null && !horarioValido(business_hours)) {
    return NextResponse.json({ error: 'Horário inválido: confira se o início é antes do fim em cada dia' }, { status: 400 })
  }

  const { error } = await createServiceRoleClient()
    .from('companies')
    .update({
      business_hours,
      away_enabled: !!away_enabled,
      away_message: typeof away_message === 'string' ? away_message.trim().slice(0, 1000) : null,
    })
    .eq('id', membro.companyId)

  if (error) return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  return NextResponse.json({ success: true })
}
