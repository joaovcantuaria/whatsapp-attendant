// Sem dependências de Node: usado também pelo middleware (Edge runtime)

// Destino pós-login aceito: só a própria página /conectar-app (evita open redirect)
export function proximoSeguro(next: string | null | undefined): string | null {
  if (!next) return null
  return next === '/conectar-app' || next.startsWith('/conectar-app?') ? next : null
}
