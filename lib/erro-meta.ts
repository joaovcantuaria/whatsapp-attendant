/**
 * Motivo de falha que a Meta devolve no webhook (statuses[].errors) traduzido para o atendente.
 * Sem isso, a mensagem só aparecia com o "X" vermelho, sem dizer por quê.
 */

export interface ErroMeta {
  code?: number
  title?: string
  message?: string
  error_data?: { details?: string }
}

const DICAS: Record<number, string> = {
  131042: 'Problema de pagamento na conta do WhatsApp Business (cadastre/regularize a forma de pagamento no Gerenciador da Meta)',
  131047: 'Passaram mais de 24h desde a última mensagem do cliente: só é possível enviar template aprovado',
  131026: 'Mensagem não entregue: o número pode não ter WhatsApp, estar com versão antiga ou ter bloqueado a empresa',
  131049: 'A Meta segurou a mensagem para preservar o engajamento (limite de mensagens de marketing para esse cliente)',
  131050: 'O cliente optou por não receber mensagens de marketing desta empresa',
  131051: 'Tipo de mensagem não suportado',
  131053: 'Falha ao enviar a mídia',
  131056: 'Muitas mensagens para o mesmo número em pouco tempo',
  132000: 'Quantidade de variáveis diferente da do template aprovado',
  132001: 'Template não existe nesse idioma ou ainda não foi aprovado',
  132005: 'Texto das variáveis ficou longo demais',
  132007: 'Conteúdo das variáveis viola a política da Meta',
  132012: 'Formato das variáveis não confere com o template',
  132015: 'Template pausado por baixa qualidade',
  132016: 'Template desativado por baixa qualidade',
  133010: 'Número da empresa não registrado na API',
  368: 'Conta temporariamente bloqueada por violação de política',
  130472: 'O número do cliente faz parte de um experimento da Meta e não recebeu a mensagem',
  131000: 'Erro desconhecido da Meta (tente novamente)',
}

export function descreverErroMeta(erros: ErroMeta[] | undefined | null): string | null {
  const erro = erros?.[0]
  if (!erro) return null
  const codigo = erro.code ? `${erro.code}` : 'sem código'
  const dica = erro.code ? DICAS[erro.code] : undefined
  const original = erro.error_data?.details || erro.message || erro.title || ''
  return `[${codigo}] ${dica || original || 'Falha no envio'}${dica && original ? ` (${original})` : ''}`.slice(0, 500)
}
