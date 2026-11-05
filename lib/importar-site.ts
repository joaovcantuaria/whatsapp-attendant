import { lookup } from 'dns/promises'
import { isIP } from 'net'

/**
 * Importa o texto de uma página pública para a base de conhecimento.
 * Bloqueia endereços internos (localhost, rede privada, metadados de nuvem) para que
 * ninguém use o Chat para acessar servidores que não deveriam ser públicos.
 */

const LIMITE_BYTES = 2 * 1024 * 1024
const LIMITE_TEXTO = 50_000

export function ipPrivado(ip: string): boolean {
  if (ip.includes(':')) {
    const v6 = ip.toLowerCase()
    if (v6 === '::1' || v6 === '::') return true
    if (v6.startsWith('fe80') || v6.startsWith('fc') || v6.startsWith('fd')) return true
    const mapeado = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return mapeado ? ipPrivado(mapeado[1]) : false
  }
  const [a, b] = ip.split('.').map(Number)
  return a === 10 || a === 127 || a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
}

export function htmlParaTexto(html: string): { titulo: string; texto: string } {
  const titulo = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
  const texto = html
    .replace(/<(script|style|noscript|svg|head|nav|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim()
  return { titulo: titulo.replace(/\s+/g, ' ').slice(0, 120), texto: texto.slice(0, LIMITE_TEXTO) }
}

export async function importarSite(endereco: string): Promise<{ ok: true; titulo: string; texto: string } | { ok: false; erro: string }> {
  let url: URL
  try {
    url = new URL(endereco)
  } catch {
    return { ok: false, erro: 'Endereço inválido' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, erro: 'Use um endereço http ou https' }

  try {
    const ips = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true })
    if (ips.length === 0 || ips.some((i) => ipPrivado(i.address))) return { ok: false, erro: 'Endereço não permitido' }
  } catch {
    return { ok: false, erro: 'Não foi possível encontrar esse site' }
  }

  try {
    // redirect: 'manual' — um redirecionamento poderia levar a um endereço interno
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'BoraGerirChat/1.0 (base de conhecimento)' } })
    if (res.status >= 300 && res.status < 400) return { ok: false, erro: 'O site redirecionou para outro endereço. Cole o endereço final.' }
    if (!res.ok) return { ok: false, erro: `O site respondeu com erro ${res.status}` }
    const tipo = res.headers.get('content-type') || ''
    if (!tipo.includes('text/html') && !tipo.includes('text/plain')) return { ok: false, erro: 'Só dá para importar páginas de texto (HTML)' }

    const corpo = await res.arrayBuffer()
    if (corpo.byteLength > LIMITE_BYTES) return { ok: false, erro: 'Página grande demais (máximo 2 MB)' }
    const html = new TextDecoder('utf-8').decode(corpo)
    const { titulo, texto } = tipo.includes('text/plain') ? { titulo: '', texto: html.slice(0, LIMITE_TEXTO) } : htmlParaTexto(html)
    if (texto.length < 50) return { ok: false, erro: 'Não encontramos texto nessa página' }
    return { ok: true, titulo: titulo || url.hostname, texto }
  } catch {
    return { ok: false, erro: 'Não foi possível ler esse site' }
  }
}
