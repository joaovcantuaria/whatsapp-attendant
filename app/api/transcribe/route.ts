import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { membroAtual } from '@/lib/membro-atual'
import { carregarConfigIA } from '@/lib/ia'
import { rateLimitSimples } from '@/lib/rate-limit-simples'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const LIMITE_BYTES = 25 * 1024 * 1024 // limite do Whisper

// Whisper pelos provedores que oferecem a API de transcrição no formato OpenAI
const TRANSCRICAO: Record<string, { url: string; modelo: string }> = {
  groq: { url: 'https://api.groq.com/openai/v1/audio/transcriptions', modelo: 'whisper-large-v3-turbo' },
  openai: { url: 'https://api.openai.com/v1/audio/transcriptions', modelo: 'whisper-1' },
}

/**
 * POST /api/transcribe { messageId } — transcreve um áudio da conversa e guarda o texto
 * em messages.transcription (a segunda chamada devolve o que já foi salvo).
 */
export async function POST(request: NextRequest) {
  const membro = await membroAtual()
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!rateLimitSimples(`transcricao:${membro.userId}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Muitas transcrições seguidas. Aguarde um minuto.' }, { status: 429 })
  }

  const { messageId } = await request.json().catch(() => ({}))
  if (typeof messageId !== 'string') return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data: msg } = await supabase
    .from('messages')
    .select('id, type, media_url, media_mime_type, transcription')
    .eq('id', messageId)
    .eq('company_id', membro.companyId)
    .single()
  if (!msg || msg.type !== 'audio' || !msg.media_url) return NextResponse.json({ error: 'Áudio não encontrado' }, { status: 404 })
  if (msg.transcription) return NextResponse.json({ texto: msg.transcription })

  const config = await carregarConfigIA(supabase, membro.companyId)
  const servico = config ? TRANSCRICAO[config.provider || 'groq'] : undefined
  if (!config || !servico) {
    return NextResponse.json({
      error: 'Para transcrever áudios, use Groq ou OpenAI em Agente de IA → Configuração (o Gemini ainda não é suportado aqui).',
    }, { status: 400 })
  }

  const audio = await baixarAudio(supabase, membro.companyId, msg.media_url)
  if (!audio.ok) return NextResponse.json({ error: audio.erro }, { status: 502 })
  if (audio.bytes.byteLength > LIMITE_BYTES) return NextResponse.json({ error: 'Áudio grande demais para transcrever (máx. 25 MB)' }, { status: 400 })

  const tipo = (msg.media_mime_type || audio.tipo || 'audio/ogg').split(';')[0]
  const extensao = tipo.includes('mpeg') ? 'mp3' : tipo.includes('mp4') ? 'm4a' : tipo.includes('wav') ? 'wav' : tipo.includes('webm') ? 'webm' : 'ogg'
  const form = new FormData()
  form.append('file', new Blob([audio.bytes], { type: tipo }), `audio.${extensao}`)
  form.append('model', servico.modelo)
  form.append('language', 'pt')
  form.append('response_format', 'json')

  try {
    const res = await fetch(servico.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.api_key}` },
      body: form,
      signal: AbortSignal.timeout(50000),
    })
    const dados = await res.json().catch(() => null)
    const texto = typeof dados?.text === 'string' ? dados.text.trim() : ''
    if (!res.ok || !texto) {
      return NextResponse.json({ error: `Não foi possível transcrever (${dados?.error?.message || res.status})` }, { status: 502 })
    }
    await supabase.from('messages').update({ transcription: texto }).eq('id', msg.id)
    return NextResponse.json({ texto })
  } catch {
    return NextResponse.json({ error: 'O serviço de transcrição não respondeu' }, { status: 502 })
  }
}

type Supabase = ReturnType<typeof createServiceRoleClient>

// Mesmas origens do /api/media: id da Meta, base64 do QR Code ou URL pública (Storage)
async function baixarAudio(
  supabase: Supabase,
  companyId: string,
  mediaUrl: string
): Promise<{ ok: true; bytes: ArrayBuffer; tipo: string | null } | { ok: false; erro: string }> {
  try {
    if (mediaUrl.startsWith('data:')) {
      const partes = mediaUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!partes) return { ok: false, erro: 'Áudio em formato desconhecido' }
      const buffer = Buffer.from(partes[2], 'base64')
      return { ok: true, bytes: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), tipo: partes[1] }
    }

    if (mediaUrl.startsWith('meta_media:')) {
      const { data: company } = await supabase.from('companies').select('whatsapp_token').eq('id', companyId).single()
      const token = company?.whatsapp_token
      if (!token) return { ok: false, erro: 'WhatsApp oficial não configurado' }
      const meta = await fetch(`https://graph.facebook.com/v22.0/${mediaUrl.replace('meta_media:', '')}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const info = await meta.json().catch(() => null)
      if (!meta.ok || !info?.url) return { ok: false, erro: 'Áudio expirado na Meta (fica disponível por cerca de 30 dias)' }
      const arquivo = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } })
      if (!arquivo.ok) return { ok: false, erro: 'Não foi possível baixar o áudio da Meta' }
      return { ok: true, bytes: await arquivo.arrayBuffer(), tipo: info.mime_type || null }
    }

    // URL pública do Storage do próprio Supabase (uploads do painel)
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    if (base && mediaUrl.startsWith(`${base}/storage/`)) {
      const arquivo = await fetch(mediaUrl)
      if (!arquivo.ok) return { ok: false, erro: 'Não foi possível baixar o áudio' }
      return { ok: true, bytes: await arquivo.arrayBuffer(), tipo: arquivo.headers.get('content-type') }
    }

    return { ok: false, erro: 'Origem do áudio não suportada para transcrição' }
  } catch {
    return { ok: false, erro: 'Falha ao baixar o áudio' }
  }
}
