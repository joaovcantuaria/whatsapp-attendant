/**
 * Regras puras das automações (sem banco/rede: usadas pelo motor, pela tela e pelos testes).
 */

export type TipoAutomacao = 'aniversario' | 'reativacao' | 'lembrete_agendamento'

// O que pode ir em cada variável {{n}} do template
export const VARIAVEIS: Record<string, string> = {
  nome: 'Primeiro nome do cliente',
  nome_completo: 'Nome completo',
  empresa: 'Nome da empresa',
  cupom: 'Código do cupom',
  desconto: 'Desconto (ex.: 10% ou R$ 20,00)',
  validade: 'Validade do cupom (dd/mm)',
  idade: 'Idade que completa',
  dias_sem_visita: 'Dias sem visita',
  servico: 'Serviço agendado',
  profissional: 'Profissional',
  data: 'Data do agendamento (dd/mm)',
  hora: 'Hora do agendamento',
  dia_semana: 'Dia da semana do agendamento',
}

export const VARIAVEIS_POR_TIPO: Record<TipoAutomacao, string[]> = {
  aniversario: ['nome', 'nome_completo', 'empresa', 'cupom', 'desconto', 'validade', 'idade'],
  reativacao: ['nome', 'nome_completo', 'empresa', 'cupom', 'desconto', 'validade', 'dias_sem_visita'],
  lembrete_agendamento: ['nome', 'nome_completo', 'empresa', 'servico', 'profissional', 'data', 'hora', 'dia_semana'],
}

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

export function partesSaoPaulo(data: Date) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  }).formatToParts(data)
  const v = (t: string) => p.find((x) => x.type === t)?.value || ''
  return {
    iso: `${v('year')}-${v('month')}-${v('day')}`,
    ddmm: `${v('day')}/${v('month')}`,
    hhmm: `${String(Number(v('hour')) % 24).padStart(2, '0')}:${v('minute')}`,
    ano: Number(v('year')),
    diaSemana: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(v('weekday')),
  }
}

/** Automação diária: roda uma vez por dia, a partir do horário de envio (Brasília). */
export function deveRodarHoje(horaEnvio: string | undefined, ultimoDia: string | null, agora = new Date()): boolean {
  const sp = partesSaoPaulo(agora)
  if (ultimoDia === sp.iso) return false
  const [h, m] = (horaEnvio || '09:00').split(':').map(Number)
  const [hAgora, mAgora] = sp.hhmm.split(':').map(Number)
  return hAgora * 60 + mAgora >= h * 60 + (m || 0)
}

// Celulares brasileiros aparecem com e sem o 9º dígito em bases diferentes
export function variantesTelefone(telefone: string): string[] {
  const d = telefone.replace(/\D/g, '')
  const com55 = d.startsWith('55') ? d : `55${d}`
  if (com55.length === 13) return [com55, com55.slice(0, 4) + com55.slice(5)]
  if (com55.length === 12) return [com55.slice(0, 4) + '9' + com55.slice(4), com55]
  return [com55]
}

export function formatarDesconto(cupom: { tipo: string; valor: number } | null): string {
  if (!cupom) return ''
  return cupom.tipo === 'percentual'
    ? `${Number(cupom.valor).toLocaleString('pt-BR')}%`
    : Number(cupom.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export interface DadosVariaveis {
  nome: string
  empresa: string
  cupom?: { codigo: string; tipo: string; valor: number; validade: string } | null
  idade?: number | null
  dias_sem_visita?: number | null
  servico?: string | null
  profissional?: string | null
  data_hora?: string | null
}

/** Valores de {{1}}, {{2}}... na ordem escolhida na tela. */
export function montarVariaveis(tokens: string[], d: DadosVariaveis): string[] {
  const quando = d.data_hora ? partesSaoPaulo(new Date(d.data_hora)) : null
  const valor = (t: string): string => {
    switch (t) {
      case 'nome': return d.nome.split(' ')[0] || d.nome
      case 'nome_completo': return d.nome
      case 'empresa': return d.empresa
      case 'cupom': return d.cupom?.codigo || ''
      case 'desconto': return formatarDesconto(d.cupom || null)
      case 'validade': return d.cupom ? d.cupom.validade.split('-').reverse().slice(0, 2).join('/') : ''
      case 'idade': return d.idade ? String(d.idade) : ''
      case 'dias_sem_visita': return d.dias_sem_visita ? String(d.dias_sem_visita) : ''
      case 'servico': return d.servico || ''
      case 'profissional': return d.profissional || ''
      case 'data': return quando?.ddmm || ''
      case 'hora': return quando?.hhmm || ''
      case 'dia_semana': return quando ? DIAS[quando.diaSemana] : ''
      default: return ''
    }
  }
  // A Meta recusa variável vazia: usa "-"
  return tokens.map((t) => valor(t).trim() || '-')
}
