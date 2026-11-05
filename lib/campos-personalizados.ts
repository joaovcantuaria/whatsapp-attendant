import type { createServiceRoleClient } from '@/lib/supabase-server'

/**
 * Campos personalizados de contato (ex.: "Plano", "Data do último serviço", "Tamanho").
 * Definições em contact_field_definitions; valores em contacts.custom_fields (jsonb, chave → valor).
 */

type Supabase = ReturnType<typeof createServiceRoleClient>

export const TIPOS_CAMPO = ['texto', 'numero', 'data', 'lista'] as const
export type TipoCampo = (typeof TIPOS_CAMPO)[number]

export interface DefinicaoCampo {
  id: string
  key: string
  label: string
  type: TipoCampo
  options: string[] | null
  position: number
}

// "Data do último serviço" → "data_do_ultimo_servico"
export function chaveDoRotulo(rotulo: string): string {
  return rotulo
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

/** Converte/valida um valor conforme o tipo; null = remover o valor. */
export function normalizarValor(def: Pick<DefinicaoCampo, 'type' | 'options' | 'label'>, valor: unknown): { ok: true; valor: string | number | null } | { ok: false; erro: string } {
  if (valor === null || valor === undefined || valor === '') return { ok: true, valor: null }
  switch (def.type) {
    case 'texto':
      return { ok: true, valor: String(valor).trim().slice(0, 500) || null }
    case 'numero': {
      const n = typeof valor === 'number' ? valor : Number(String(valor).replace(/\./g, '').replace(',', '.'))
      return Number.isFinite(n) ? { ok: true, valor: n } : { ok: false, erro: `"${def.label}" precisa ser um número` }
    }
    case 'data': {
      const texto = String(valor)
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null
      const valida = iso && !Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime()) && new Date(`${iso}T00:00:00Z`).toISOString().startsWith(iso)
      return valida ? { ok: true, valor: iso } : { ok: false, erro: `"${def.label}" precisa ser uma data válida` }
    }
    case 'lista': {
      const texto = String(valor)
      return (def.options || []).includes(texto) ? { ok: true, valor: texto } : { ok: false, erro: `"${def.label}": escolha uma das opções` }
    }
  }
}

/** Mantém só os campos definidos pela empresa, já convertidos. */
export async function valoresCamposValidos(
  supabase: Supabase,
  companyId: string,
  valores: unknown
): Promise<{ ok: true; valores: Record<string, string | number> } | { ok: false; erro: string }> {
  if (!valores || typeof valores !== 'object' || Array.isArray(valores)) return { ok: false, erro: 'Campos personalizados inválidos' }
  const { data: defs } = await supabase
    .from('contact_field_definitions')
    .select('key, label, type, options')
    .eq('company_id', companyId)

  const saida: Record<string, string | number> = {}
  for (const def of defs || []) {
    if (!(def.key in (valores as Record<string, unknown>))) continue
    const r = normalizarValor(def as DefinicaoCampo, (valores as Record<string, unknown>)[def.key])
    if (!r.ok) return r
    if (r.valor !== null) saida[def.key] = r.valor
  }
  return { ok: true, valores: saida }
}
