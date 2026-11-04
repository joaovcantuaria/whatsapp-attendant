import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase-server'

/**
 * Vínculo Chat ↔ Bora Gerir App (por company).
 * O App manda um token "bga_..." que o Chat usa para ler dados em
 * {app_url}/api/integracoes/chat/v1/* (aniversariantes, inativos, cliente).
 */

const ALGORITHM = 'aes-256-gcm'

function chaveCriptografia(): Buffer {
  const chave = process.env.APP_LINK_ENCRYPTION_KEY || ''
  if (!/^[0-9a-f]{64}$/i.test(chave)) {
    throw new Error('APP_LINK_ENCRYPTION_KEY ausente ou inválida (precisa de 64 caracteres hex)')
  }
  return Buffer.from(chave, 'hex')
}

export function appLinkConfigurado(): boolean {
  return /^[0-9a-f]{64}$/i.test(process.env.APP_LINK_ENCRYPTION_KEY || '')
}

// Formato: iv:tag:ciphertext (hex) — o mesmo do App (lib/cora/crypto.ts)
export function criptografar(texto: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, chaveCriptografia(), iv)
  const cifrado = cipher.update(texto, 'utf8', 'hex') + cipher.final('hex')
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${cifrado}`
}

export function descriptografar(texto: string): string {
  const [iv, tag, cifrado] = texto.split(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, chaveCriptografia(), Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  return decipher.update(cifrado, 'hex', 'utf8') + decipher.final('utf8')
}

// Só aceita vincular a URLs conhecidas do App — impede que alguém com a API key
// aponte o Chat para um servidor próprio e receba as consultas
export function origemPermitida(appUrl: string): boolean {
  const permitidas = (process.env.APP_LINK_ALLOWED_ORIGINS || 'https://app.boragerir.com')
    .split(',').map((o) => o.trim().replace(/\/$/, ''))
  try {
    return permitidas.includes(new URL(appUrl).origin)
  } catch {
    return false
  }
}

// ─── Fluxo "Conectar com BoraGerir Chat" (/conectar-app) ─────

export const CAMINHO_CALLBACK_APP = '/api/integracoes/chat/callback'

// redirect_uri só pode ser o callback do App numa origem permitida
export function redirectUriPermitida(uri: unknown): uri is string {
  if (typeof uri !== 'string') return false
  try {
    const url = new URL(uri)
    return origemPermitida(url.origin) && url.pathname === CAMINHO_CALLBACK_APP && !url.search && !url.hash
  } catch {
    return false
  }
}

export function hashCodigo(codigo: string): string {
  return crypto.createHash('sha256').update(codigo).digest('hex')
}

// PKCE S256: base64url(sha256(verifier))
export function desafioPkce(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

export function gerarApiKey(): string {
  return 'bgc_' + crypto.randomBytes(32).toString('hex')
}

// Valida o header x-api-key (mesma tabela das outras rotas /api/external/*)
export async function companyDaApiKey(apiKey: string | null): Promise<string | null> {
  if (!apiKey) return null
  const { data } = await createServiceRoleClient()
    .from('api_keys')
    .select('company_id, is_active')
    .eq('key', apiKey)
    .single()
  return data?.is_active ? data.company_id : null
}

/**
 * Consulta a API do App em nome da company.
 * Ex.: await consultarApp(companyId, 'aniversariantes?dias=0')
 */
export async function consultarApp<T = unknown>(
  companyId: string,
  caminho: string
): Promise<{ ok: true; dados: T } | { ok: false; status: number; erro: string }> {
  const { data: link } = await createServiceRoleClient()
    .from('app_links')
    .select('app_url, app_token_enc')
    .eq('company_id', companyId)
    .single()

  if (!link) return { ok: false, status: 404, erro: 'Empresa não vinculada ao Bora Gerir App' }

  try {
    const res = await fetch(`${link.app_url}/api/integracoes/chat/v1/${caminho}`, {
      headers: { Authorization: `Bearer ${descriptografar(link.app_token_enc)}` },
      signal: AbortSignal.timeout(20000),
      cache: 'no-store',
    })
    const corpo = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, status: res.status, erro: corpo?.erro || `Erro ${res.status} no App` }
    return { ok: true, dados: corpo as T }
  } catch {
    return { ok: false, status: 502, erro: 'Não foi possível acessar o Bora Gerir App' }
  }
}
