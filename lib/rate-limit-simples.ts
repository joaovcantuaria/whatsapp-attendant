// Limite de pedidos por chave, em memória (por instância do servidor). Suficiente para
// conter abuso acidental de botões que chamam a IA; não é proteção contra ataque distribuído.
const janelas = new Map<string, { contagem: number; reiniciaEm: number }>()

export function rateLimitSimples(chave: string, limite: number, janelaMs: number): boolean {
  const agora = Date.now()
  const atual = janelas.get(chave)
  if (!atual || agora > atual.reiniciaEm) {
    janelas.set(chave, { contagem: 1, reiniciaEm: agora + janelaMs })
    return true
  }
  if (atual.contagem >= limite) return false
  atual.contagem++
  return true
}
