import { createServiceRoleClient } from '@/lib/supabase-server'
import { selecionarTrechos, blocoConhecimento } from '@/lib/conhecimento'

/**
 * Chamada aos provedores de IA (Groq, Gemini, OpenAI — todos no formato OpenAI)
 * usando a mesma configuração do Agente de IA da empresa (ai_agent_config).
 */

type Supabase = ReturnType<typeof createServiceRoleClient>

export interface ConfigIA {
  provider: string
  api_key: string
  model: string
  system_prompt: string | null
  temperature: number | null
  max_tokens: number | null
}

export type MensagemIA = { role: 'system' | 'user' | 'assistant'; content: string }

export function endpointProvedor(provider: string): string {
  switch (provider) {
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions'
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    case 'openai':
    default:
      return 'https://api.openai.com/v1/chat/completions'
  }
}

export function cabecalhosProvedor(provider: string, apiKey: string): Record<string, string> {
  return provider === 'gemini'
    ? { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }
    : { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }
}

/** Configuração de IA da empresa (precisa só de chave; não exige o agente automático ligado). */
export async function carregarConfigIA(supabase: Supabase, companyId: string): Promise<ConfigIA | null> {
  const { data } = await supabase
    .from('ai_agent_config')
    .select('provider, api_key, model, system_prompt, temperature, max_tokens')
    .eq('company_id', companyId)
    .single()
  return data?.api_key ? (data as ConfigIA) : null
}

export async function chamarIA(
  config: ConfigIA,
  mensagens: MensagemIA[],
  opcoes: { temperatura?: number; maxTokens?: number } = {}
): Promise<{ ok: true; texto: string; tokens: number } | { ok: false; erro: string }> {
  const provider = config.provider || 'groq'
  try {
    const res = await fetch(endpointProvedor(provider), {
      method: 'POST',
      headers: cabecalhosProvedor(provider, config.api_key),
      body: JSON.stringify({
        model: config.model || 'llama-3.3-70b-versatile',
        messages: mensagens,
        temperature: opcoes.temperatura ?? config.temperature ?? 0.7,
        max_tokens: opcoes.maxTokens ?? config.max_tokens ?? 500,
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      const erro = await res.text().catch(() => '')
      return { ok: false, erro: `${provider}: ${erro.slice(0, 200) || res.status}` }
    }
    const dados = await res.json()
    const texto = dados.choices?.[0]?.message?.content?.trim() || ''
    if (!texto) return { ok: false, erro: 'A IA não devolveu resposta' }
    return { ok: true, texto, tokens: dados.usage?.total_tokens || 0 }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Falha ao chamar a IA' }
  }
}

/** Bloco com os trechos da base de conhecimento relevantes para a pergunta (ou vazio). */
export async function conhecimentoParaPergunta(supabase: Supabase, companyId: string, pergunta: string): Promise<string> {
  const { data: docs } = await supabase
    .from('ai_knowledge')
    .select('title, content')
    .eq('company_id', companyId)
    .limit(200)
  return blocoConhecimento(selecionarTrechos(docs || [], pergunta))
}
