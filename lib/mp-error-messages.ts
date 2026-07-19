const mpErrorMessages: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Número do cartão inválido',
  cc_rejected_bad_filled_date: 'Data de validade inválida',
  cc_rejected_bad_filled_security_code: 'Código de segurança inválido',
  cc_rejected_insufficient_amount: 'Saldo insuficiente',
  cc_rejected_call_for_authorize:
    'Pagamento não autorizado. Entre em contato com seu banco.',
  cc_rejected_card_disabled:
    'Cartão desabilitado. Ative no app do seu banco.',
  cc_rejected_duplicated_payment:
    'Pagamento duplicado. Tente novamente em alguns minutos.',
  cc_rejected_max_attempts:
    'Limite de tentativas excedido. Tente novamente mais tarde.',
}

const DEFAULT_ERROR_MESSAGE = 'Pagamento recusado. Tente outro cartão.'

export function getMpErrorMessage(code: string | undefined | null): string {
  if (!code) return DEFAULT_ERROR_MESSAGE
  return mpErrorMessages[code] ?? DEFAULT_ERROR_MESSAGE
}
